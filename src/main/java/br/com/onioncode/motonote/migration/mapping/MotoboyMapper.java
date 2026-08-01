package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.Motoboy;
import org.bson.Document;

public class MotoboyMapper {

    public Motoboy map(Document doc) {
        Motoboy motoboy = new Motoboy();
        motoboy.setId(MongoDocumentUtils.id(doc));
        motoboy.setName(doc.getString("name"));
        motoboy.setUsuarioId(doc.getString("usuarioId"));
        motoboy.setEmail(doc.getString("email"));
        motoboy.setPassword(doc.getString("password"));
        return motoboy;
    }
}
