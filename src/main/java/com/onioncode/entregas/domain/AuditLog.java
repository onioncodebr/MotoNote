package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

// Registro de ações administrativas sensíveis feitas pelo MASTER (bloqueio,
// exclusão, edição e criação de usuário, concessão manual de assinatura) —
// ver AuditoriaService para os pontos onde isso é gravado.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "auditoria_log")
public class AuditLog {

    @Id
    private String id;

    private String actorId;
    private String actorNome;
    private String actorEmail;

    private TipoAcaoAuditoria acao;

    private String alvoTipo;
    private String alvoId;
    private String alvoDescricao;

    private Map<String, Object> detalhes;

    @Indexed
    private Instant criadoEm;
}
