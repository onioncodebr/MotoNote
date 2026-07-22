package com.onioncode.entregas.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onioncode.entregas.exception.ApiError;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class SecurityFilter extends OncePerRequestFilter {

    private final TokenService tokenService;
    private final AuthorizationService authorizationService;
    // Instância própria em vez de injetar o ObjectMapper gerenciado pelo
    // Spring: esse filtro roda muito cedo na cadeia de segurança, antes da
    // auto-configuração do Jackson terminar de registrar o bean — a
    // injeção falhava no boot com "no bean of type ObjectMapper found".
    // WRITE_DATES_AS_TIMESTAMPS desligado pra "timestamp" sair como string
    // ISO igual ao resto da API (o ObjectMapper gerenciado pelo Spring já
    // vem assim por padrão; esse aqui é uma instância própria, ver acima).
    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    public SecurityFilter(TokenService tokenService, AuthorizationService authorizationService) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            String token = extrairToken(request);
            if (token != null) {
                String email = tokenService.validateToken(token);

                UserDetails user = authorizationService.loadUserByUsername(email);

                // Reavaliado a cada request (não só no login) porque o
                // usuário recarrega do Mongo aqui de qualquer forma — dá
                // revogação de acesso "imediata" quando o MASTER desativa
                // uma conta, sem precisar de blacklist de token: o próximo
                // request com o token antigo já esbarra nesse check, mesmo
                // que o JWT em si ainda esteja dentro da validade.
                // 423 (Locked) em vez de 403: o frontend já usa um 403 em
                // /api/usuarios/me como sinal de "esse token é de motoboy,
                // tenta /api/motoboy/me" (ver getCurrentUser em api.js) —
                // reaproveitar 403 aqui faria uma conta desativada cair
                // silenciosamente nesse fallback em vez de mostrar o erro.
                if (!user.isEnabled() || !user.isAccountNonLocked()) {
                    // 423 = Locked. Não está entre as constantes SC_* do
                    // HttpServletResponse (só define até a faixa "clássica"
                    // de status codes), por isso o literal aqui.
                    escreverErro(response, 423, "Locked",
                            "Esta conta foi desativada.", request.getRequestURI());
                    return;
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user, null, user.getAuthorities()
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (ExpiredJwtException | UnsupportedJwtException | MalformedJwtException | SignatureException
                 | IllegalArgumentException | BadCredentialsException | UsernameNotFoundException e) {
            // UsernameNotFoundException entra aqui pro caso de um token válido
            // e não expirado apontar pra um email que não existe mais (conta
            // deletada depois do token ser emitido) — sem isso a exceção
            // escapava do filtro (roda antes do @RestControllerAdvice) e
            // virava 500 não tratado em vez de um 401 limpo. BadCredentialsException
            // fica na lista por precaução, mesmo não sendo mais lançada por
            // loadUserByUsername (ver AuthorizationService).
            escreverErro(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized",
                    "Sessão expirada ou token inválido. Faça login novamente.", request.getRequestURI());
            return;
        }

        filterChain.doFilter(request, response);
    }

    // Cookie httpOnly é o caminho principal (é assim que o frontend manda a
    // sessão desde a migração pra fora do localStorage). O header
    // Authorization continua funcionando como alternativa — não tem
    // downside de segurança mantê-lo (o SPA nunca mais tem o token pra
    // colocar lá), e ajuda pra testar a API direto (curl, Postman etc.).
    private String extrairToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (TokenService.AUTH_COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring("Bearer ".length());
        }

        return null;
    }

    // Escreve como o resto da API (ApiError em JSON, UTF-8 explícito) — antes
    // ia texto cru sem charset, chegando com acentuação quebrada e sem ser
    // JSON válido, então o frontend não conseguia extrair nem exibir a mensagem.
    private void escreverErro(HttpServletResponse response, int status, String error, String message, String path)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        ApiError apiError = new ApiError(LocalDateTime.now(), status, error, message, path);
        objectMapper.writeValue(response.getWriter(), apiError);
    }
}
