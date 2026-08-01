package br.com.onioncode.motonote.security;

import jakarta.annotation.PreDestroy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

// Rate limiter em memória (janela fixa por chave) — padrão da aplicação,
// suficiente enquanto o backend roda numa única instância (ver
// docker-compose.prod.yml: hoje só existe um container "backend"). Cada
// instância tem seu próprio contador, isolado das demais; se um dia rodar
// atrás de load balancer com múltiplas réplicas, ative
// rate-limit.store=redis (ver RedisRateLimiter) pra compartilhar a
// contagem entre elas.
@Component
@ConditionalOnProperty(name = "rate-limit.store", havingValue = "memory", matchIfMissing = true)
public class InMemoryRateLimiter implements RateLimiter {

    private record Janela(AtomicInteger contagem, long inicioMillis) {}

    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();
    private final ScheduledExecutorService limpeza = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "rate-limiter-cleanup");
        t.setDaemon(true);
        return t;
    });

    public InMemoryRateLimiter() {
        limpeza.scheduleAtFixedRate(this::limparExpiradas, 5, 5, TimeUnit.MINUTES);
    }

    @Override
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
