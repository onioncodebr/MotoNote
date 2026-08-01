package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Troca de senha pendente de confirmação — o código vai pro e-mail já
// cadastrado na conta (prova posse do e-mail antes de trocar a senha),
// mesmo padrão de AlteracaoTelefonePendente. A nova senha já vem com hash
// aplicado aqui (nunca em texto plano) e só é copiada pro Usuario depois
// que o código é confirmado — ver
// UsuarioService.solicitarAlteracaoSenha/confirmarAlteracaoSenha. Sem TTL
// nativo no Postgres — expiraEm é limpo por LimpezaExpiradosJob
// (@Scheduled), ver V14__alteracoes_senha_pendentes.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "alteracoes_senha_pendentes")
public class AlteracaoSenhaPendente extends EntidadeComIdAssinalavel {

    private String usuarioId;

    private String novaSenhaHash;
    private String codigoHash;
    private int tentativas;

    private Instant criadoEm;

    private Instant expiraEm;
}
