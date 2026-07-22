package com.onioncode.entregas.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class TokenService {

    // Compartilhado com AuthenticationController pra manter o Max-Age do
    // cookie de sessão em sincronia com a expiração real do JWT dentro dele
    // — sem isso é fácil os dois valores desalinharem numa mudança futura.
    public static final Duration TOKEN_TTL = Duration.ofHours(2);

    // Nome do cookie httpOnly que carrega o JWT — compartilhado entre
    // AuthenticationController (que seta/limpa) e SecurityFilter (que lê).
    public static final String AUTH_COOKIE_NAME = "auth_token";

    @Value("${api.security.token.secret}")
    private String secret;

    // Valida a chave no boot (não só no primeiro login/token) pra falhar
    // rápido se JWT_SECRET vier vazio ou fraco. hmacShaKeyFor já rejeita
    // chaves curtas demais pro algoritmo HMAC-SHA usado na assinatura.
    @PostConstruct
    void validarSecret() {
        Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }


    // Recebe UserDetails (não só Usuario) pra funcionar tanto pro dono da
    // conta quanto pro portal do motoboy — os dois autenticam pelo mesmo
    // /api/auth/login, e o subject do token é sempre o "username" (email)
    // de quem for.
    public String generateToken(UserDetails principal){
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(principal.getUsername())
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plus(TOKEN_TTL)))
                .signWith(key)
                .compact();

    }


    public String validateToken(String token){

        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

}


