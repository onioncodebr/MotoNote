package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.Gasto;
import org.bson.Document;

public class GastoMapper {

    public Gasto map(Document doc) {
        Gasto gasto = new Gasto();
        gasto.setId(MongoDocumentUtils.id(doc));
        gasto.setMotoboyId(doc.getString("motoboyId"));
        gasto.setDescricao(doc.getString("descricao"));
        gasto.setValue(MongoDocumentUtils.toDouble(doc, "value"));
        gasto.setLocalDate(MongoDocumentUtils.toLocalDate(doc, "localDate"));
        gasto.setComprovanteKey(doc.getString("comprovanteKey"));
        return gasto;
    }
}
