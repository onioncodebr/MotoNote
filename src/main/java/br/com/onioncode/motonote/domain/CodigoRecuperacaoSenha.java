package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Código de recuperação de senha — ver RecuperacaoSenhaService. Sem TTL
// nativo no Postgres — expiraEm é limpo por LimpezaExpiradosJob
// (@Scheduled), ver V12__codigos_recuperacao_senha.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "codigos_recuperacao_senha")
public class CodigoRecuperacaoSenha extends EntidadeComIdAssinalavel {

    private String email;

    private String codigoHash;
    private int tentativas;
    private boolean usado;

    private Instant criadoEm;

    private Instant expiraEm;
}
