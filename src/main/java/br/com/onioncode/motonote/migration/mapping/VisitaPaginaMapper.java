package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.TipoVisitaPagina;
import br.com.onioncode.motonote.domain.VisitaPagina;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class VisitaPaginaMapper {

    private static final Logger log = LoggerFactory.getLogger(VisitaPaginaMapper.class);

    public VisitaPagina map(Document doc) {
        VisitaPagina visita = new VisitaPagina();
        visita.setId(MongoDocumentUtils.id(doc));
        visita.setTipo(MongoDocumentUtils.toEnum(doc, "tipo", TipoVisitaPagina.class, log));
        visita.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        return visita;
    }
}
