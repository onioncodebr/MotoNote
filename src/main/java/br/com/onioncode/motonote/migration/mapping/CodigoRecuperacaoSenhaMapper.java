package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.CodigoRecuperacaoSenha;
import org.bson.Document;

public class CodigoRecuperacaoSenhaMapper {

    public CodigoRecuperacaoSenha map(Document doc) {
        CodigoRecuperacaoSenha codigo = new CodigoRecuperacaoSenha();
        codigo.setId(MongoDocumentUtils.id(doc));
        codigo.setEmail(doc.getString("email"));
        codigo.setCodigoHash(doc.getString("codigoHash"));
        codigo.setTentativas(doc.getInteger("tentativas", 0));
        codigo.setUsado(doc.getBoolean("usado", false));
        codigo.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        codigo.setExpiraEm(MongoDocumentUtils.toInstant(doc, "expiraEm"));
        return codigo;
    }
}
