package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Troca de telefone pendente de confirmação — o código vai pro e-mail já
// cadastrado na conta (prova posse do e-mail antes de trocar o telefone),
// ver UsuarioService.solicitarAlteracaoTelefone/confirmarAlteracaoTelefone.
// Sem TTL nativo no Postgres — expiraEm é limpo por LimpezaExpiradosJob
// (@Scheduled), ver V13__alteracoes_telefone_pendentes.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "alteracoes_telefone_pendentes")
public class AlteracaoTelefonePendente extends EntidadeComIdAssinalavel {

    private String usuarioId;

    private String novoTelefone;
    private String codigoHash;
    private int tentativas;

    private Instant criadoEm;

    private Instant expiraEm;
}
