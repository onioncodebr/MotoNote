package com.onioncode.entregas.security;

import com.onioncode.entregas.service.ConfiguracaoSistemaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

// Limita requisições por IP em duas camadas: regras específicas mais
// rígidas pra login/cadastro (dificultar brute-force e credential
// stuffing) e uma regra geral, bem mais generosa, cobrindo QUALQUER rota
// (inclusive as já autenticadas) — antes disso só login/signup tinham
// alguma barreira, o resto da API (e o único GET público,
// /api/assinaturas/plano) não tinha limite nenhum. Roda antes do
// SecurityFilter porque login/signup não têm JWT ainda (é o próprio
// endpoint que gera o token) e porque a regra geral precisa valer mesmo
// pra quem ainda não autenticou.
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final long JANELA_LOGIN_MILLIS = TimeUnit.MINUTES.toMillis(5);
    // Máximo de tentativas configurável pelo MASTER (ConfiguracaoSistema.
    // rateLimitLoginMaxTentativas) — ver ConfiguracaoSistemaService; a
    // janela em si continua fixa.

    private static final long JANELA_SIGNUP_MILLIS = TimeUnit.HOURS.toMillis(1);
    private static final int MAX_TENTATIVAS_SIGNUP = 5;

    // Plano é o único outro endpoint 100% público (sem JWT) — limite bem
    // mais folgado que login/signup, só pra impedir raspagem/abuso, já que
    // é só leitura de preço/trial pra landing page e cadastro.
    private static final long JANELA_PLANO_MILLIS = TimeUnit.MINUTES.toMillis(1);
    private static final int MAX_TENTATIVAS_PLANO = 30;

    // Cadastro em duas etapas e recuperação de senha (todos públicos, sem
    // JWT ainda): "iniciar"/"forgot" mandam e-mail, então usam a mesma
    // janela restrita do signup de hoje; "confirmar"/"reset" são chute de
    // código de 6 dígitos, janela mais curta e mais tentativas (o limite por
    // registro dentro do próprio código, em CadastroService/
    // RecuperacaoSenhaService, já barra em 5 tentativas antes disso).
    private static final long JANELA_ENVIO_CODIGO_MILLIS = TimeUnit.HOURS.toMillis(1);
    private static final int MAX_TENTATIVAS_ENVIO_CODIGO = 5;

    private static final long JANELA_CONFIRMACAO_CODIGO_MILLIS = TimeUnit.MINUTES.toMillis(15);
    private static final int MAX_TENTATIVAS_CONFIRMACAO_CODIGO = 10;

    // Regra geral: cobre toda /api/**, autenticada ou não. Generosa de
    // propósito — o objetivo é conter abuso/custo (conta comprometida,
    // script martelando a API), não travar uso normal do dashboard, que
    // faz no máximo algumas dezenas de chamadas por troca de tela.
    private static final long JANELA_GERAL_MILLIS = TimeUnit.MINUTES.toMillis(1);
    // Também configurável (ConfiguracaoSistema.rateLimitGeralMaxTentativas).

    private final RateLimiter rateLimiter;
    private final ConfiguracaoSistemaService configuracaoSistemaService;

    public AuthRateLimitFilter(RateLimiter rateLimiter, ConfiguracaoSistemaService configuracaoSistemaService) {
        this.rateLimiter = rateLimiter;
        this.configuracaoSistemaService = configuracaoSistemaService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String metodo = request.getMethod();
        String ip = clientIp(request);

        if (!rateLimiter.tentarConsumir("geral:" + ip, configuracaoSistemaService.rateLimitGeralMaxTentativas(), JANELA_GERAL_MILLIS)) {
            responderBloqueado(response, path);
            return;
        }

        boolean permitido = true;
        if ("POST".equals(metodo) && path.equals("/api/auth/login")) {
            permitido = rateLimiter.tentarConsumir("login:" + ip, configuracaoSistemaService.rateLimitLoginMaxTentativas(), JANELA_LOGIN_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/signup")) {
            permitido = rateLimiter.tentarConsumir("signup:" + ip, MAX_TENTATIVAS_SIGNUP, JANELA_SIGNUP_MILLIS);
        } else if ("GET".equals(metodo) && path.equals("/api/assinaturas/plano")) {
            permitido = rateLimiter.tentarConsumir("plano:" + ip, MAX_TENTATIVAS_PLANO, JANELA_PLANO_MILLIS);
        } else if ("GET".equals(metodo) && path.equals("/api/configuracoes/exibicao")) {
            permitido = rateLimiter.tentarConsumir("exibicao:" + ip, MAX_TENTATIVAS_PLANO, JANELA_PLANO_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/signup/iniciar")) {
            permitido = rateLimiter.tentarConsumir("cadastro-iniciar:" + ip, MAX_TENTATIVAS_ENVIO_CODIGO, JANELA_ENVIO_CODIGO_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/signup/confirmar")) {
            permitido = rateLimiter.tentarConsumir("cadastro-confirmar:" + ip, MAX_TENTATIVAS_CONFIRMACAO_CODIGO, JANELA_CONFIRMACAO_CODIGO_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/forgot-password")) {
            permitido = rateLimiter.tentarConsumir("forgot-password:" + ip, MAX_TENTATIVAS_ENVIO_CODIGO, JANELA_ENVIO_CODIGO_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/reset-password")) {
            permitido = rateLimiter.tentarConsumir("reset-password:" + ip, MAX_TENTATIVAS_CONFIRMACAO_CODIGO, JANELA_CONFIRMACAO_CODIGO_MILLIS);
        }

        if (!permitido) {
            responderBloqueado(response, path);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void responderBloqueado(HttpServletResponse response, String path) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Muitas tentativas. Tente novamente em alguns minutos.\",\"path\":\""
                        + path + "\"}"
        );
    }

    // X-Forwarded-For só é confiável quando algo na frente (proxy/load
    // balancer) sobrescreve o header e não deixa o cliente injetar um valor
    // arbitrário. A topologia de produção documentada (DEPLOY.md) tem
    // exatamente UM hop confiável na frente do backend (Nginx Proxy
    // Manager, único ponto exposto — o backend não publica porta nenhuma
    // pro host): um nginx padrão usa `$proxy_add_x_forwarded_for`, que
    // ANEXA o IP de quem conectou nele ao final de um X-Forwarded-For que o
    // cliente já tenha mandado, em vez de substituir. Por isso pegamos o
    // ÚLTIMO valor da lista (o que o proxy confiável viu de verdade), não o
    // primeiro (que o cliente controla livremente forjando o header).
    // Se um dia existir mais de um proxy confiável em cadeia, esse número
    // de hops confiáveis (hoje 1, contado a partir do fim) precisa mudar
    // junto.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] ips = forwarded.split(",");
            return ips[ips.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
