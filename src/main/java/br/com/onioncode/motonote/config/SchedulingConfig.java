package br.com.onioncode.motonote.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Habilita o processamento de @Scheduled em toda a aplicação — usado por
// TrialLembreteService (aviso de trial terminando) e LimpezaExpiradosJob
// (limpeza dos códigos de confirmação expirados, sem TTL nativo no
// Postgres), mas fica centralizado aqui pra qualquer job futuro reaproveitar
// sem precisar de config própria.
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
