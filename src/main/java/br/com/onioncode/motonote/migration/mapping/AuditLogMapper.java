package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.AuditLog;
import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AuditLogMapper {

    private static final Logger log = LoggerFactory.getLogger(AuditLogMapper.class);

    public AuditLog map(Document doc) {
        AuditLog registro = new AuditLog();
        registro.setId(MongoDocumentUtils.id(doc));
        registro.setActorId(doc.getString("actorId"));
        registro.setActorNome(doc.getString("actorNome"));
        registro.setActorEmail(doc.getString("actorEmail"));
        registro.setAcao(MongoDocumentUtils.toEnum(doc, "acao", TipoAcaoAuditoria.class, log));
        registro.setAlvoTipo(doc.getString("alvoTipo"));
        registro.setAlvoId(doc.getString("alvoId"));
        registro.setAlvoDescricao(doc.getString("alvoDescricao"));
        if (doc.get("detalhes") instanceof Document detalhes) {
            registro.setDetalhes(sanitizarMapa(detalhes));
        }
        registro.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        return registro;
    }

    // detalhes é schema livre (Map<String,Object> -> JSONB) — precisa
    // recursivamente trocar tipos exclusivos do BSON (ObjectId, Date) por
    // tipos serializáveis como JSON puro antes de gravar no Postgres.
    private Map<String, Object> sanitizarMapa(Document detalhes) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : detalhes.entrySet()) {
            resultado.put(entry.getKey(), sanitizarValor(entry.getValue()));
        }
        return resultado;
    }

    private Object sanitizarValor(Object valor) {
        if (valor instanceof Document d) return sanitizarMapa(d);
        if (valor instanceof List<?> lista) return lista.stream().map(this::sanitizarValor).toList();
        if (valor instanceof ObjectId oid) return oid.toHexString();
        if (valor instanceof Date d) return d.toInstant().toString();
        return valor;
    }
}
