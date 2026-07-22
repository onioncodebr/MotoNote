package com.onioncode.entregas.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

// Cache de curtíssimo prazo pro resultado de "esse usuário tem acesso
// liberado?", que o AssinaturaGateFilter (via AssinaturaService.temAcessoLiberado)
// checa em TODA requisição autenticada — sem isso é uma consulta ao Mongo
// por request. TTL curto porque é só otimização de leitura repetida; toda
// mudança real de status (webhook do Stripe, concessão manual) já invalida
// a entrada na hora via AssinaturaService.salvar, então o TTL só cobre a
// folga entre chamadas, não é a única defesa contra dado desatualizado.
@Component
public class AssinaturaAcessoCache {

    private static final long TTL_MILLIS = TimeUnit.SECONDS.toMillis(30);

    private record Entrada(boolean acessoLiberado, long expiraEmMillis) {}

    private final ConcurrentHashMap<String, Entrada> cache = new ConcurrentHashMap<>();

    public Boolean get(String usuarioId) {
        Entrada entrada = cache.get(usuarioId);
        if (entrada == null || System.currentTimeMillis() >= entrada.expiraEmMillis()) {
            return null;
        }
        return entrada.acessoLiberado();
    }

    public void put(String usuarioId, boolean acessoLiberado) {
        cache.put(usuarioId, new Entrada(acessoLiberado, System.currentTimeMillis() + TTL_MILLIS));
    }

    public void invalidar(String usuarioId) {
        cache.remove(usuarioId);
    }
}
