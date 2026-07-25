package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Troca de senha pendente de confirmação — o código vai pro e-mail já
// cadastrado na conta (prova posse do e-mail antes de trocar a senha),
// mesmo padrão de AlteracaoTelefonePendente. A nova senha já vem com hash
// aplicado aqui (nunca em texto plano) e só é copiada pro Usuario depois
// que o código é confirmado — ver
// UsuarioService.solicitarAlteracaoSenha/confirmarAlteracaoSenha.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "alteracoes_senha_pendentes")
public class AlteracaoSenhaPendente {

    @Id
    private String id;

    @Indexed
    private String usuarioId;

    private String novaSenhaHash;
    private String codigoHash;
    private int tentativas;

    private Instant criadoEm;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiraEm;
}
