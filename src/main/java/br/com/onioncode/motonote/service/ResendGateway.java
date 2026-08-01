package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.exception.EmailIndisponivelException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

// Encapsula a chamada crua à API REST do Resend (mesmo papel que
// StripeGateway tem pro Stripe) — um único POST /emails, sem necessidade do
// SDK oficial. Se resend.api-key estiver vazia (não configurada ainda): em
// dev (resend.log-fallback=true, ver application-dev.properties) o e-mail
// só é logado, pra dar pra testar o fluxo inteiro sem conta no Resend; fora
// de dev, falha alto com EmailIndisponivelException em vez de silenciosamente
// não mandar nada.
@Service
public class ResendGateway {

    private static final Logger log = LoggerFactory.getLogger(ResendGateway.class);

    private final RestClient restClient;
    private final String fromEmail;
    private final boolean apiKeyConfigurada;
    private final boolean logFallback;

    public ResendGateway(@Value("${resend.api-key}") String apiKey,
                          @Value("${resend.from-email}") String fromEmail,
                          @Value("${resend.log-fallback}") boolean logFallback) {
        this.fromEmail = fromEmail;
        this.logFallback = logFallback;
        this.apiKeyConfigurada = !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public void enviar(String destinatario, String assunto, String html) {
        if (!apiKeyConfigurada) {
            if (logFallback) {
                log.warn("Resend não configurado — e-mail não enviado. Para: {}, assunto: {}\n{}",
                        destinatario, assunto, html);
                return;
            }
            throw new EmailIndisponivelException("envio de e-mail não configurado.");
        }

        try {
            restClient.post()
                    .uri("/emails")
                    .body(Map.of(
                            "from", fromEmail,
                            "to", List.of(destinatario),
                            "subject", assunto,
                            "html", html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            // O corpo do erro do Resend (e.getMessage()) pode conter detalhe
            // interno da conta (ex.: restrição de domínio sandbox) — fica só
            // no log do servidor, nunca na resposta pro cliente (mesmo
            // princípio do catch-all em GlobalExceptionHandler).
            log.error("Falha ao enviar e-mail via Resend. Para: {}, assunto: {}", destinatario, assunto, e);
            throw new EmailIndisponivelException("tente novamente em instantes.");
        }
    }
}
