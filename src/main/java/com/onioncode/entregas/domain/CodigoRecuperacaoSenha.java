package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Código de recuperação de senha — ver RecuperacaoSenhaService. TTL index em
// expiraEm (mesma técnica de CadastroPendente/AlteracaoTelefonePendente).
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "codigos_recuperacao_senha")
public class CodigoRecuperacaoSenha {

    @Id
    private String id;

    @Indexed
    private String email;

    private String codigoHash;
    private int tentativas;
    private boolean usado;

    private Instant criadoEm;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiraEm;
}
