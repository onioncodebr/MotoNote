package com.onioncode.entregas.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

// Limita tentativas de login/cadastro por IP pra dificultar brute-force e
// credential stuffing — antes disso não havia nenhuma barreira nesses dois
// endpoints. Roda antes do SecurityFilter porque login/signup não têm JWT
// ainda (é o próprio endpoint que gera o token).
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final long JANELA_LOGIN_MILLIS = TimeUnit.MINUTES.toMillis(5);
    private static final int MAX_TENTATIVAS_LOGIN = 10;

    private static final long JANELA_SIGNUP_MILLIS = TimeUnit.HOURS.toMillis(1);
    private static final int MAX_TENTATIVAS_SIGNUP = 5;

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

        boolean permitido;
        if ("POST".equals(metodo) && path.equals("/api/auth/login")) {
            permitido = rateLimiter.tentarConsumir("login:" + ip, MAX_TENTATIVAS_LOGIN, JANELA_LOGIN_MILLIS);
        } else if ("POST".equals(metodo) && path.equals("/api/auth/signup")) {
            permitido = rateLimiter.tentarConsumir("signup:" + ip, MAX_TENTATIVAS_SIGNUP, JANELA_SIGNUP_MILLIS);
        } else {
            filterChain.doFilter(request, response);
            return;
        }

        if (!permitido) {
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Muitas tentativas. Tente novamente em alguns minutos.\",\"path\":\""
                            + path + "\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
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
