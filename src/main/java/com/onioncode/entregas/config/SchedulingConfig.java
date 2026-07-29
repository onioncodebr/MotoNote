package com.onioncode.entregas.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Habilita o processamento de @Scheduled em toda a aplicação — hoje usado só
// por TrialLembreteService (aviso de trial terminando), mas fica centralizado
// aqui pra qualquer job futuro reaproveitar sem precisar de config própria.
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
