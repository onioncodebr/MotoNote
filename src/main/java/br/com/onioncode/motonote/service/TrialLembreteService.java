package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.Assinatura;
import br.com.onioncode.motonote.domain.StatusAssinatura;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.repository.AssinaturaRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

// Job diário que avisa usuários em trial (TRIALING) cujo período gratuito
// termina amanhã, informando que a cobrança do plano vai começar. Roda
// contra o Mongo diretamente (trialTerminaEm), não contra o webhook
// customer.subscription.trial_will_end do Stripe — o webhook não garante
// timing de "exatamente 1 dia antes".
@Service
public class TrialLembreteService {

    private static final Logger log = LoggerFactory.getLogger(TrialLembreteService.class);
    private static final ZoneId ZONE_BRASIL = ZoneId.of("America/Sao_Paulo");

    private final AssinaturaRepo assinaturaRepo;
    private final UsuarioRepo usuarioRepo;
    private final EmailTemplateService emailTemplateService;
    private final ResendGateway resendGateway;

    public TrialLembreteService(AssinaturaRepo assinaturaRepo, UsuarioRepo usuarioRepo,
                                 EmailTemplateService emailTemplateService, ResendGateway resendGateway) {
        this.assinaturaRepo = assinaturaRepo;
        this.usuarioRepo = usuarioRepo;
        this.emailTemplateService = emailTemplateService;
        this.resendGateway = resendGateway;
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "America/Sao_Paulo")
    public void avisarTrialTerminando() {
        LocalDate amanha = LocalDate.now(ZONE_BRASIL).plusDays(1);
        Instant inicio = amanha.atStartOfDay(ZONE_BRASIL).toInstant();
        Instant fim = amanha.plusDays(1).atStartOfDay(ZONE_BRASIL).toInstant();

        List<Assinatura> candidatas = assinaturaRepo
                .findByStatusAndTrialTerminaEmGreaterThanEqualAndTrialTerminaEmLessThan(
                        StatusAssinatura.TRIALING, inicio, fim);

        if (candidatas.isEmpty()) {
            return;
        }

        List<String> usuarioIds = candidatas.stream().map(Assinatura::getUsuarioId).toList();
        Map<String, Usuario> usuariosPorId = usuarioRepo.findAllById(usuarioIds).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u));

        int enviados = 0;
        for (Assinatura assinatura : candidatas) {
            if (Objects.equals(assinatura.getTrialTerminaEm(), assinatura.getTrialTerminaEmAvisado())) {
                continue;
            }

            Usuario usuario = usuariosPorId.get(assinatura.getUsuarioId());
            if (usuario == null) {
                log.warn("Assinatura {} sem Usuario correspondente (usuarioId={}) — pulando aviso de trial.",
                        assinatura.getId(), assinatura.getUsuarioId());
                continue;
            }

            try {
                enviarAviso(usuario, assinatura);
                enviados++;
            } catch (Exception e) {
                log.error("Falha ao enviar aviso de trial terminando. usuarioId={}, assinaturaId={}",
                        assinatura.getUsuarioId(), assinatura.getId(), e);
            }
        }

        log.info("Aviso de trial terminando: {} candidatas, {} e-mails enviados.", candidatas.size(), enviados);
    }

    private void enviarAviso(Usuario usuario, Assinatura assinatura) {
        String mensagem = "Seu período de teste gratuito no MotoNote termina amanhã. A partir de então, "
                + "a cobrança do seu plano será iniciada automaticamente.";
        String html = emailTemplateService.renderizarAvisoTrial(usuario.getName(), mensagem);
        resendGateway.enviar(usuario.getEmail(), "Seu trial termina amanhã - MotoNote", html);

        assinatura.setTrialTerminaEmAvisado(assinatura.getTrialTerminaEm());
        assinaturaRepo.save(assinatura);
    }
}
