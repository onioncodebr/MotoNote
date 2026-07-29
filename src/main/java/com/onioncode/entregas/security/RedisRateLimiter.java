package com.onioncode.entregas.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

// Rate limiter distribuído via Redis — ativado com rate-limit.store=redis
// (ver melhorias.md 2.1). Necessário só quando o backend roda em mais de
// uma instância (load balancer/múltiplos containers): cada instância bate
// no mesmo Redis, então a contagem por IP/rota é compartilhada entre elas,
// diferente do InMemoryRateLimiter (padrão), onde cada instância conta por
// conta própria.
//
// INCR + EXPIRE (só no primeiro INCR da janela) é o padrão clássico de rate
// limit de janela fixa em Redis: INCR é atômico, então duas instâncias
// incrementando a mesma chave ao mesmo tempo nunca perdem contagem uma da
// outra (diferente de "ler o valor, comparar, gravar de volta", que teria
// uma condição de corrida entre instâncias). Único ponto fraco aceito: se o
// processo cair bem entre o INCR que criou a chave (contagem == 1) e o
// EXPIRE seguinte, a chave fica sem expiração — na prática isso só limparia
// sozinho numa reinicialização do Redis; não é um risco de segurança (no
// pior caso essa UMA chave fica presa até ser sobrescrita por uma nova
// janela), só uma imperfeição conhecida do padrão INCR+EXPIRE não-atômico
// (a alternativa totalmente atômica seria um script Lua, desnecessário aqui).
@Component
@ConditionalOnProperty(name = "rate-limit.store", havingValue = "redis")
public class RedisRateLimiter implements RateLimiter {

    private static final String PREFIXO_CHAVE = "ratelimit:";

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tentarConsumir(String chave, int maxTentativas, long janelaMillis) {
        String chaveRedis = PREFIXO_CHAVE + chave;
        Long contagem = redisTemplate.opsForValue().increment(chaveRedis);
        if (contagem != null && contagem == 1L) {
            redisTemplate.expire(chaveRedis, Duration.ofMillis(janelaMillis));
        }
        return contagem != null && contagem <= maxTentativas;
    }
}
