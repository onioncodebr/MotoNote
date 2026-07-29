package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Document(collection = "assinatura")
public class Assinatura {

    @Id
    private String id;

    @Indexed(unique = true)
    private String usuarioId;

    private String stripeCustomerId;
    private String stripeSubscriptionId;

    // Usado pelo filtro por status na listagem paginada de Usuários (MASTER).
    @Indexed
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
