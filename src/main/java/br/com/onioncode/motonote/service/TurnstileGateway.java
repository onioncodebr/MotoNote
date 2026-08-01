package br.com.onioncode.motonote.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import br.com.onioncode.motonote.exception.CaptchaInvalidoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

// Valida o token do Cloudflare Turnstile (widget anti-automação nos
// formulários públicos de cadastro/login/recuperação de senha) contra a API
// oficial — um único POST /siteverify, sem SDK. Mesmo padrão do
// ResendGateway: se turnstile.secret-key estiver vazia (não configurada
// ainda), a validação vira no-op — a proteção liga sozinha quando a chave
// chega, sem quebrar cadastro/login/recuperação enquanto isso.
@Service
public class TurnstileGateway {

    private static final Logger log = LoggerFactory.getLogger(TurnstileGateway.class);

    private final RestClient restClient;
    private final String secretKey;
    private final boolean secretConfigurada;

    public TurnstileGateway(@Value("${turnstile.secret-key}") String secretKey) {
        this.secretKey = secretKey;
        this.secretConfigurada = !secretKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl("https://challenges.cloudflare.com/turnstile/v0")
                .build();
    }

    // Sem chave configurada: não bloqueia (proteção ainda não ativada). Com
    // chave configurada: token ausente ou reprovado pela Cloudflare lança
    // CaptchaInvalidoException.
    public void validar(String token) {
        if (!secretConfigurada) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new CaptchaInvalidoException();
        }

        try {
            SiteverifyResponse resposta = restClient.post()
                    .uri("/siteverify")
                    .body(Map.of("secret", secretKey, "response", token))
                    .retrieve()
                    .body(SiteverifyResponse.class);

            if (resposta == null || !resposta.success()) {
                throw new CaptchaInvalidoException();
            }
        } catch (RestClientException e) {
            log.error("Falha ao validar Turnstile", e);
            throw new CaptchaInvalidoException();
        }
    }

    private record SiteverifyResponse(boolean success, @JsonProperty("error-codes") List<String> errorCodes) {
    }
}
