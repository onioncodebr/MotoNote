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
}
