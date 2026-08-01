package br.com.onioncode.motonote.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

// Registro de ações administrativas sensíveis feitas pelo MASTER (bloqueio,
// exclusão, edição e criação de usuário, concessão manual de assinatura) —
// ver AuditoriaService para os pontos onde isso é gravado. actorId/alvoId
// sem FK física (ver V8__auditoria_log.sql) — log histórico, precisa
// sobreviver à exclusão do usuário-alvo, e alvoId/alvoTipo são polimórficos.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "auditoria_log")
public class AuditLog extends EntidadeComIdAssinalavel {

    private String actorId;
    private String actorNome;
    private String actorEmail;

    @Enumerated(EnumType.STRING)
    private TipoAcaoAuditoria acao;

    private String alvoTipo;
    private String alvoId;
    private String alvoDescricao;

    // Schema livre — suporte nativo do Hibernate a JSON/JSONB, sem lib extra.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> detalhes;

    private Instant criadoEm;
}
