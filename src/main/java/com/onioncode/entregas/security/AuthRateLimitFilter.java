package com.onioncode.entregas.security;

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
    private static final int MAX_TENTATIVAS_LOGIN = 10;

    private static final long JANELA_SIGNUP_MILLIS = TimeUnit.HOURS.toMillis(1);
    private static final int MAX_TENTATIVAS_SIGNUP = 5;

    // Plano é o único outro endpoint 100% público (sem JWT) — limite bem
    // mais folgado que login/signup, só pra impedir raspagem/abuso, já que
    // é só leitura de preço/trial pra landing page e cadastro.
    private static final long JANELA_PLANO_MILLIS = TimeUnit.MINUTES.toMillis(1);
    private static final int MAX_TENTATIVAS_PLANO = 30;

    // Regra geral: cobre toda /api/**, autenticada ou não. Generosa de
    // propósito — o objetivo é conter abuso/custo (conta comprometida,
    // script martelando a API), não travar uso normal do dashboard, que
    // faz no máximo algumas dezenas de chamadas por troca de tela.
    private static final long JANELA_GERAL_MILLIS = TimeUnit.MINUTES.toMillis(1);
    private static final int MAX_TENTATIVAS_GERAL = 300;

    private final RateLimiter rateLimiter;

    public AuthRateLimitFilter(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String metodo = request.getMethod();
        String ip = clientIp(request);

        if (!rateLimiter.tentarConsumir("geral:" + ip, MAX_TENTATIVAS_GERAL, JANELA_GERAL_MILLIS)) {
            responderBloqueado(response, path);
            return;
        }

        boolean permitido = true;
        if ("POST".equals(metodo) && path.equals("/api/auth/login")) {
            permitido = rateLimiter.tentarConsumir("login:" + ip, MAX_TENTATIVAS_LOGIN, JANELA_LOGIN_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/signup")) {
            permitido = rateLimiter.tentarConsumir("signup:" + ip, MAX_TENTATIVAS_SIGNUP, JANELA_SIGNUP_MILLIS);
        } else if ("GET".equals(metodo) && path.equals("/api/assinaturas/plano")) {
            permitido = rateLimiter.tentarConsumir("plano:" + ip, MAX_TENTATIVAS_PLANO, JANELA_PLANO_MILLIS);
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
    // arbitrário. Ajustar aqui se o ambiente de deploy não garantir isso.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
