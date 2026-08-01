package br.com.onioncode.motonote.dto;

import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@AllArgsConstructor
public class AuditLogResponseDTO {

    private String id;
    private String actorNome;
    private String actorEmail;
    private TipoAcaoAuditoria acao;
    private String alvoTipo;
    private String alvoId;
    private String alvoDescricao;
    private Map<String, Object> detalhes;
    private Instant criadoEm;
}
