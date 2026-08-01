package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "assinatura")
public class Assinatura extends EntidadeComIdAssinalavel {

    // Único (V4__assinatura.sql) — relação 1:1 com Usuario.
    private String usuarioId;

    private String stripeCustomerId;
    private String stripeSubscriptionId;

    // Usado pelo filtro por status na listagem paginada de Usuários (MASTER),
    // indexado em V4__assinatura.sql.
    @Enumerated(EnumType.STRING)
    private StatusAssinatura status;
    private Instant trialTerminaEm;
    private Instant periodoAtualTerminaEm;
    private Instant criadoEm;
    private Instant atualizadoEm;

    // Guarda o valor de trialTerminaEm para o qual o e-mail de "trial termina
    // amanhã" já foi enviado (ver TrialLembreteService) — não é só um
    // booleano "já avisou" porque trialTerminaEm pode mudar depois de um
    // aviso já ter sido enviado (concederManual dando um novo trial, ou
    // trial_end alterado manualmente no Stripe): comparar contra o valor
    // atual de trialTerminaEm garante que uma renovação sempre dispara um
    // novo aviso, e que reexecuções no mesmo dia não duplicam envio.
    private Instant trialTerminaEmAvisado;
}
