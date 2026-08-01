package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.service.AssinaturaService;
import br.com.onioncode.motonote.service.StripeGateway;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

// Recebe eventos assíncronos do Stripe — é a fonte da verdade sobre o status
// da assinatura (o retorno síncrono do Checkout no navegador não garante que
// o backend do Stripe já provisionou tudo). Rota liberada em SecurityConfig
// (permitAll) porque o Stripe não manda um Bearer JWT; a autenticidade da
// chamada é garantida pela verificação de assinatura HMAC abaixo, não pelo
// Spring Security.
@RestController
@RequestMapping("/api/webhooks")
public class StripeWebhookController {

    private final StripeGateway stripeGateway;
    private final AssinaturaService assinaturaService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    public StripeWebhookController(StripeGateway stripeGateway, AssinaturaService assinaturaService) {
        this.stripeGateway = stripeGateway;
        this.assinaturaService = assinaturaService;
    }

    @PostMapping("/stripe")
    public ResponseEntity<Void> receberWebhook(
            HttpServletRequest request,
            @RequestHeader("Stripe-Signature") String signature) throws IOException {

        // A verificação de assinatura exige o corpo BRUTO exato — não dá pra usar
        // @RequestBody tipado aqui, o Jackson já teria consumido/reformatado o stream.
        String payload = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);

        Event event;
        try {
            event = stripeGateway.validarEventoWebhook(payload, signature, webhookSecret);
        } catch (SignatureVerificationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();

        // getObject() pode vir vazio se o evento foi serializado numa versão da
        // API diferente da que o SDK espera — nesse caso só ignoramos o evento
        // em vez de quebrar (handlers são idempotentes, um próximo evento do
        // mesmo objeto volta a sincronizar o estado corretamente).
        switch (event.getType()) {
            case "checkout.session.completed" -> deserializer.getObject().ifPresent(obj ->
                    assinaturaService.tratarCheckoutCompletado((Session) obj));
            case "customer.subscription.updated" -> deserializer.getObject().ifPresent(obj ->
                    assinaturaService.tratarSubscriptionAtualizada((Subscription) obj));
            case "customer.subscription.deleted" -> deserializer.getObject().ifPresent(obj ->
                    assinaturaService.tratarSubscriptionCancelada((Subscription) obj));
            case "invoice.payment_failed" -> deserializer.getObject().ifPresent(obj ->
                    assinaturaService.tratarPagamentoFalhou((Invoice) obj));
            case "invoice.payment_succeeded" -> deserializer.getObject().ifPresent(obj ->
                    assinaturaService.tratarPagamentoConfirmado((Invoice) obj));
            default -> { /* evento não tratado por essa integração, ignorado */ }
        }

        return ResponseEntity.ok().build();
    }
}
