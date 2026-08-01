package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.StatusVale;
import br.com.onioncode.motonote.domain.Vale;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ValeMapper {

    private static final Logger log = LoggerFactory.getLogger(ValeMapper.class);

    public Vale map(Document doc) {
        Vale vale = new Vale();
        vale.setId(MongoDocumentUtils.id(doc));
        vale.setMotoboyId(doc.getString("motoboyId"));
        vale.setDescricao(doc.getString("descricao"));
        vale.setValue(MongoDocumentUtils.toDouble(doc, "value"));
        vale.setStatus(MongoDocumentUtils.toEnum(doc, "status", StatusVale.class, log));
        vale.setLocalDate(MongoDocumentUtils.toLocalDate(doc, "localDate"));
        vale.setGrupoParcelamento(doc.getString("grupoParcelamento"));
        vale.setNumeroParcela(doc.getInteger("numeroParcela"));
        vale.setTotalParcelas(doc.getInteger("totalParcelas"));
        return vale;
    }
}
