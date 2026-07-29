package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Assinatura;
import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.repository.AssinaturaRepo;
import com.onioncode.entregas.repository.UsuarioRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrialLembreteServiceTest {

    private static final Instant TRIAL_TERMINA_EM = Instant.parse("2026-07-30T09:00:00Z");

    @Mock
    private AssinaturaRepo assinaturaRepo;
    @Mock
    private UsuarioRepo usuarioRepo;
    @Mock
    private EmailTemplateService emailTemplateService;
    @Mock
    private ResendGateway resendGateway;

    private TrialLembreteService service() {
        return new TrialLembreteService(assinaturaRepo, usuarioRepo, emailTemplateService, resendGateway);
    }

    private void mockCandidatas(Assinatura... candidatas) {
        when(assinaturaRepo.findByStatusAndTrialTerminaEmGreaterThanEqualAndTrialTerminaEmLessThan(
                eq(StatusAssinatura.TRIALING), any(), any()))
                .thenReturn(List.of(candidatas));
    }

    private static Assinatura assinatura(String id, String usuarioId, Instant trialTerminaEmAvisado) {
        Assinatura assinatura = new Assinatura();
        assinatura.setId(id);
        assinatura.setUsuarioId(usuarioId);
        assinatura.setStatus(StatusAssinatura.TRIALING);
        assinatura.setTrialTerminaEm(TRIAL_TERMINA_EM);
        assinatura.setTrialTerminaEmAvisado(trialTerminaEmAvisado);
        return assinatura;
    }

    private static Usuario usuario(String id, String nome, String email) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setName(nome);
        usuario.setEmail(email);
        return usuario;
    }

    @Test
    void enviaAvisoEMarcaAssinaturaQuandoCandidataAindaNaoFoiAvisada() {
        Assinatura assinatura = assinatura("assinatura-1", "usuario-1", null);
        Usuario usuario = usuario("usuario-1", "Fulano", "fulano@example.com");

        mockCandidatas(assinatura);
        when(usuarioRepo.findAllById(List.of("usuario-1"))).thenReturn(List.of(usuario));
        when(emailTemplateService.renderizarAvisoTrial(anyString(), anyString())).thenReturn("<html></html>");

        service().avisarTrialTerminando();

        verify(resendGateway).enviar(eq("fulano@example.com"), anyString(), anyString());
        verify(assinaturaRepo).save(assinatura);
        assertThat(assinatura.getTrialTerminaEmAvisado()).isEqualTo(TRIAL_TERMINA_EM);
    }

    @Test
    void naoReenviaQuandoAssinaturaJaFoiAvisadaParaOMesmoTrialTerminaEm() {
        Assinatura assinatura = assinatura("assinatura-1", "usuario-1", TRIAL_TERMINA_EM);
        Usuario usuario = usuario("usuario-1", "Fulano", "fulano@example.com");

        mockCandidatas(assinatura);
        when(usuarioRepo.findAllById(List.of("usuario-1"))).thenReturn(List.of(usuario));

        service().avisarTrialTerminando();

        verifyNoInteractions(resendGateway);
        verify(assinaturaRepo, never()).save(any());
    }

    @Test
    void reenviaQuandoTrialFoiRenovadoAposUmAvisoAnterior() {
        // trialTerminaEmAvisado aponta pra um trialTerminaEm antigo (ex.: MASTER
        // concedeu um novo trial via concederManual depois do aviso anterior já
        // ter saído) — o aviso atual (TRIAL_TERMINA_EM) ainda não foi enviado.
        Instant trialAntigoJaAvisado = Instant.parse("2026-06-01T09:00:00Z");
        Assinatura assinatura = assinatura("assinatura-1", "usuario-1", trialAntigoJaAvisado);
        Usuario usuario = usuario("usuario-1", "Fulano", "fulano@example.com");

        mockCandidatas(assinatura);
        when(usuarioRepo.findAllById(List.of("usuario-1"))).thenReturn(List.of(usuario));
        when(emailTemplateService.renderizarAvisoTrial(anyString(), anyString())).thenReturn("<html></html>");

        service().avisarTrialTerminando();

        verify(resendGateway).enviar(eq("fulano@example.com"), anyString(), anyString());
        assertThat(assinatura.getTrialTerminaEmAvisado()).isEqualTo(TRIAL_TERMINA_EM);
    }

    @Test
    void falhaDeEnvioParaUmaCandidataNaoImpedeProcessamentoDasDemais() {
        Assinatura assinaturaComFalha = assinatura("assinatura-1", "usuario-1", null);
        Assinatura assinaturaOk = assinatura("assinatura-2", "usuario-2", null);
        Usuario usuarioComFalha = usuario("usuario-1", "Fulano", "fulano@example.com");
        Usuario usuarioOk = usuario("usuario-2", "Ciclano", "ciclano@example.com");

        mockCandidatas(assinaturaComFalha, assinaturaOk);
        when(usuarioRepo.findAllById(List.of("usuario-1", "usuario-2")))
                .thenReturn(List.of(usuarioComFalha, usuarioOk));
        when(emailTemplateService.renderizarAvisoTrial(anyString(), anyString())).thenReturn("<html></html>");
        doThrow(new RuntimeException("Resend indisponível"))
                .when(resendGateway).enviar(eq("fulano@example.com"), anyString(), anyString());

        service().avisarTrialTerminando();

        verify(resendGateway).enviar(eq("ciclano@example.com"), anyString(), anyString());
        verify(assinaturaRepo).save(assinaturaOk);
        verify(assinaturaRepo, never()).save(assinaturaComFalha);
        assertThat(assinaturaComFalha.getTrialTerminaEmAvisado()).isNull();
    }

    @Test
    void pulaCandidataSemUsuarioCorrespondente() {
        Assinatura assinatura = assinatura("assinatura-1", "usuario-orfao", null);

        mockCandidatas(assinatura);
        when(usuarioRepo.findAllById(List.of("usuario-orfao"))).thenReturn(List.of());

        service().avisarTrialTerminando();

        verifyNoInteractions(resendGateway);
        verify(assinaturaRepo, never()).save(any());
    }
}
