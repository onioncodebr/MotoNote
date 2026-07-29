package com.onioncode.entregas.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Cobre o rate limiter distribuído (melhorias.md 2.1) — mockando o Redis
// (StringRedisTemplate) pra isolar a lógica de janela fixa (INCR + EXPIRE
// só no primeiro INCR). O comportamento fim-a-fim contra um Redis de
// verdade foi conferido manualmente com um container redis:7-alpine.
@ExtendWith(MockitoExtension.class)
class RedisRateLimiterTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisRateLimiter limiter() {
        return new RedisRateLimiter(redisTemplate);
    }

    @Test
    void primeiraTentativaDentroDoLimiteEPermitidaESetaExpiracao() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("ratelimit:login:1.2.3.4")).thenReturn(1L);

        boolean permitido = limiter().tentarConsumir("login:1.2.3.4", 5, 60_000);

        assertThat(permitido).isTrue();
        verify(redisTemplate).expire("ratelimit:login:1.2.3.4", Duration.ofMillis(60_000));
    }

    @Test
    void tentativasSeguintesDentroDoLimiteNaoResetamAExpiracao() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("ratelimit:login:1.2.3.4")).thenReturn(3L);

        boolean permitido = limiter().tentarConsumir("login:1.2.3.4", 5, 60_000);

        assertThat(permitido).isTrue();
        // Só o INCR que CRIA a chave (contagem == 1) seta o TTL — do
        // contrário cada tentativa dentro da janela empurraria a expiração
        // pra frente, e a janela nunca fecharia de verdade.
        verify(redisTemplate, never()).expire(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(Duration.class));
    }

    @Test
    void tentativaAcimaDoLimiteEBloqueada() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("ratelimit:login:1.2.3.4")).thenReturn(6L);

        boolean permitido = limiter().tentarConsumir("login:1.2.3.4", 5, 60_000);

        assertThat(permitido).isFalse();
    }
}
