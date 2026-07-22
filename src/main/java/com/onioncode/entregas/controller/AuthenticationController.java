package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.LoginRequestDTO;
import com.onioncode.entregas.dto.SignupRequestDTO;
import com.onioncode.entregas.security.TokenService;
import com.onioncode.entregas.service.AssinaturaService;
import com.onioncode.entregas.service.UsuarioService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;
    private final UsuarioService usuarioService;
    private final AssinaturaService assinaturaService;

    // false só em dev (application-dev.properties) pra funcionar em HTTP
    // local sem TLS — um cookie Secure nunca é mandado pelo browser fora de
    // HTTPS, então em qualquer ambiente que não seja localhost isso tem que
    // ser true.
    @Value("${app.cookie-secure:true}")
    private boolean cookieSecure;

    public AuthenticationController(AuthenticationManager authenticationManager, TokenService tokenService,
                                     UsuarioService usuarioService, AssinaturaService assinaturaService) {
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
        this.usuarioService = usuarioService;
        this.assinaturaService = assinaturaService;
    }

    // Cadastro público: cria a conta (sempre role USER, ver UsuarioService.signup),
    // o placeholder de assinatura (SEM_ASSINATURA) e já loga automaticamente
    // (cookie de sessão), pra o frontend seguir direto pro checkout.
    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@RequestBody @Valid SignupRequestDTO data, HttpServletResponse response) {
        Usuario usuario = usuarioService.signup(data);
        assinaturaService.criarPlaceholder(usuario.getId());
        setAuthCookie(response, tokenService.generateToken(usuario));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid LoginRequestDTO data, HttpServletResponse response){
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                data.getEmail(),
                data.getPassword()
        );

        Authentication auth = authenticationManager.authenticate(authenticationToken);

        // Pode ser um Usuario (dono da conta) ou um Motoboy (portal
        // restrito) — os dois autenticam por aqui, ver AuthorizationService.
        UserDetails principal = (UserDetails) auth.getPrincipal();
        setAuthCookie(response, tokenService.generateToken(principal));
        return ResponseEntity.noContent().build();
    }

    // Um cookie httpOnly não pode ser apagado via JS — o frontend precisa
    // desse endpoint pra receber um Set-Cookie que expira ele.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        clearAuthCookie(response);
        return ResponseEntity.noContent().build();
    }

    private void setAuthCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(TokenService.AUTH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                // Lax porque o deploy alvo é frontend e backend no mesmo
                // domínio (atrás do mesmo proxy) — nesse cenário não precisa
                // de None (que exigiria Secure sempre e abriria risco de
                // CSRF sem um token dedicado pra isso).
                .sameSite("Lax")
                .path("/")
                .maxAge(TokenService.TOKEN_TTL)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearAuthCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(TokenService.AUTH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
