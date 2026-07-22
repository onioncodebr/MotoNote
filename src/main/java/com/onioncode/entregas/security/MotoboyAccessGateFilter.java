package com.onioncode.entregas.security;

import com.onioncode.entregas.domain.Motoboy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Praticamente todo service do sistema assume que Authentication.getPrincipal()
// é um Usuario (ex.: "Usuario user = (Usuario) authentication.getPrincipal()").
// Um Motoboy autenticado (portal restrito, só leitura) batendo em qualquer
// uma dessas rotas quebraria com ClassCastException (500 feio). Em vez de
// revisar cada service um a um, este filtro barra de saída: um token de
// Motoboy só passa pra /api/auth/** e pro próprio portal (/api/motoboy/me/**).
// Roda logo depois do SecurityFilter (contexto de autenticação já
// populado) — ver addFilterAfter em SecurityConfig.
@Component
public class MotoboyAccessGateFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null && authentication.getPrincipal() instanceof Motoboy)) {
            // Não é um Motoboy autenticado (é Usuario, ou ninguém ainda) —
            // esse filtro não tem nada a dizer sobre essa requisição.
            filterChain.doFilter(request, response);
            return;
        }

        if (permitido(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(403);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Este acesso é restrito ao portal do motoboy.\",\"path\":\""
                        + request.getRequestURI() + "\"}"
        );
    }

    private boolean permitido(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equals(method)) return true;
        if (path.startsWith("/api/auth/")) return true;
        if (path.startsWith("/api/motoboy/me")) return true;
        return false;
    }
}
