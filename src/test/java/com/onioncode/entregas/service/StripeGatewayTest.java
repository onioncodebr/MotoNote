package com.onioncode.entregas.service;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Cobre a verificação de assinatura dos webhooks do Stripe (melhorias.md
// 1.5) — é a única coisa que garante que uma chamada em /api/webhooks/stripe
// (rota liberada sem JWT, ver StripeWebhookController) realmente veio do
// Stripe e não foi forjada por um terceiro. Monta a assinatura manualmente
// seguindo o esquema documentado publicamente pelo Stripe (t=<timestamp>,
// v1=HMAC-SHA256(secret, timestamp + "." + payload)) em vez de depender de
// uma chamada de rede real.
class StripeGatewayTest {

    private static final String WEBHOOK_SECRET = "whsec_teste_1234567890";

    private final StripeGateway gateway = new StripeGateway();

    private static String assinar(String payload, long timestamp, String secret) throws Exception {
        String payloadAssinado = timestamp + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payloadAssinado.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) hex.append(String.format("%02x", b));
        return hex.toString();
    }

    private static String payloadEventoMinimo(String tipo) {
        return "{\"id\":\"evt_teste\",\"object\":\"event\",\"type\":\"" + tipo + "\",\"data\":{\"object\":{\"id\":\"obj_teste\",\"object\":\"customer\"}}}";
    }

    @Test
    void assinaturaValidaRetornaEventoComTipoCorreto() throws Exception {
        String payload = payloadEventoMinimo("checkout.session.completed");
        long timestamp = Instant.now().getEpochSecond();
        String assinatura = assinar(payload, timestamp, WEBHOOK_SECRET);
        String sigHeader = "t=" + timestamp + ",v1=" + assinatura;

        Event evento = gateway.validarEventoWebhook(payload, sigHeader, WEBHOOK_SECRET);

        assertThat(evento.getType()).isEqualTo("checkout.session.completed");
    }

    @Test
    void assinaturaComSegredoErradoLancaExcecao() throws Exception {
        String payload = payloadEventoMinimo("checkout.session.completed");
        long timestamp = Instant.now().getEpochSecond();
        String assinatura = assinar(payload, timestamp, "whsec_segredo_errado");
        String sigHeader = "t=" + timestamp + ",v1=" + assinatura;

        assertThatThrownBy(() -> gateway.validarEventoWebhook(payload, sigHeader, WEBHOOK_SECRET))
                .isInstanceOf(SignatureVerificationException.class);
    }

    // Payload alterado depois de assinado (ex.: um proxy/atacante mexendo no
    // corpo em trânsito) — a assinatura não bate mais com o novo conteúdo.
    @Test
    void payloadAlteradoAposAssinarLancaExcecao() throws Exception {
        String payloadOriginal = payloadEventoMinimo("checkout.session.completed");
        long timestamp = Instant.now().getEpochSecond();
        String assinatura = assinar(payloadOriginal, timestamp, WEBHOOK_SECRET);
        String sigHeader = "t=" + timestamp + ",v1=" + assinatura;
        String payloadAdulterado = payloadEventoMinimo("customer.subscription.deleted");

        assertThatThrownBy(() -> gateway.validarEventoWebhook(payloadAdulterado, sigHeader, WEBHOOK_SECRET))
                .isInstanceOf(SignatureVerificationException.class);
    }

    @Test
    void assinaturaComFormatoInvalidoLancaExcecao() {
        String payload = payloadEventoMinimo("checkout.session.completed");

        assertThatThrownBy(() -> gateway.validarEventoWebhook(payload, "assinatura-nao-e-nesse-formato", WEBHOOK_SECRET))
                .isInstanceOf(SignatureVerificationException.class);
    }
}
