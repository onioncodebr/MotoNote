package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Cadastro público ainda não confirmado — só vira um Usuario de verdade
// quando o código é validado (ver CadastroService.confirmarCadastro). A
// senha já chega com hash (não é reencodada na confirmação); o código
// também é guardado com hash, nunca em texto puro. Sem TTL nativo no
// Postgres (diferente do Mongo) — expiraEm é limpo por
// LimpezaExpiradosJob (@Scheduled), ver V11__cadastros_pendentes.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cadastros_pendentes")
public class CadastroPendente extends EntidadeComIdAssinalavel {

    private String email;

    private String name;
    private String phone;
    private String senhaHash;
    private String codigoHash;
    private int tentativas;

    private Instant criadoEm;

    private Instant expiraEm;
}
