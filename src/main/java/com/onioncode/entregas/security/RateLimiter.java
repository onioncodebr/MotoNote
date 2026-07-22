package com.onioncode.entregas.security;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

// Rate limiter em memória (janela fixa por chave), suficiente enquanto o
// backend roda numa única instância. Se um dia rodar atrás de load balancer
// com múltiplas instâncias, cada uma teria seu próprio contador — nesse
// cenário isso precisaria virar algo compartilhado (Redis).
@Component
public class RateLimiter {

    private record Janela(AtomicInteger contagem, long inicioMillis) {}

    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();
    private final ScheduledExecutorService limpeza = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "rate-limiter-cleanup");
        t.setDaemon(true);
        return t;
    });

    public RateLimiter() {
        limpeza.scheduleAtFixedRate(this::limparExpiradas, 5, 5, TimeUnit.MINUTES);
    }

    // Retorna true se a tentativa for permitida (dentro do limite), false se
    // a chave já estourou maxTentativas dentro da janela atual.
    public boolean tentarConsumir(String chave, int maxTentativas, long janelaMillis) {
        long agora = System.currentTimeMillis();
        Janela janela = janelas.compute(chave, (k, atual) -> {
            if (atual == null || agora - atual.inicioMillis() >= janelaMillis) {
                return new Janela(new AtomicInteger(1), agora);
            }
            atual.contagem().incrementAndGet();
            return atual;
        });
        return janela.contagem().get() <= maxTentativas;
    }

    private void limparExpiradas() {
        long agora = System.currentTimeMillis();
        long retencaoMillis = TimeUnit.MINUTES.toMillis(10);
        janelas.entrySet().removeIf(e -> agora - e.getValue().inicioMillis() > retencaoMillis);
    }

    @PreDestroy
    void encerrar() {
        limpeza.shutdownNow();
    }
}
