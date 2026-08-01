package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.CadastroPendente;
import org.bson.Document;

public class CadastroPendenteMapper {

    public CadastroPendente map(Document doc) {
        CadastroPendente cadastro = new CadastroPendente();
        cadastro.setId(MongoDocumentUtils.id(doc));
        cadastro.setEmail(doc.getString("email"));
        cadastro.setName(doc.getString("name"));
        cadastro.setPhone(doc.getString("phone"));
        cadastro.setSenhaHash(doc.getString("senhaHash"));
        cadastro.setCodigoHash(doc.getString("codigoHash"));
        cadastro.setTentativas(doc.getInteger("tentativas", 0));
        cadastro.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        cadastro.setExpiraEm(MongoDocumentUtils.toInstant(doc, "expiraEm"));
        return cadastro;
    }
}
