package br.com.onioncode.motonote.security;

// Duas implementações (ver InMemoryRateLimiter/RedisRateLimiter), escolhida
// via a propriedade rate-limit.store (memory, padrão, ou redis — ver
// melhorias.md 2.1). O contrato é o mesmo pras duas: nunca falha por causa
// do rate limiter em si, sempre é chave -> contagem numa janela de tempo.
public interface RateLimiter {

    // Retorna true se a tentativa for permitida (dentro do limite), false se
    // a chave já estourou maxTentativas dentro da janela atual.
    boolean tentarConsumir(String chave, int maxTentativas, long janelaMillis);
}
