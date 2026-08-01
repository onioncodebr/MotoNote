package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.AlteracaoSenhaPendente;
import org.bson.Document;

public class AlteracaoSenhaPendenteMapper {

    public AlteracaoSenhaPendente map(Document doc) {
        AlteracaoSenhaPendente alteracao = new AlteracaoSenhaPendente();
        alteracao.setId(MongoDocumentUtils.id(doc));
        alteracao.setUsuarioId(doc.getString("usuarioId"));
        alteracao.setNovaSenhaHash(doc.getString("novaSenhaHash"));
        alteracao.setCodigoHash(doc.getString("codigoHash"));
        alteracao.setTentativas(doc.getInteger("tentativas", 0));
        alteracao.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        alteracao.setExpiraEm(MongoDocumentUtils.toInstant(doc, "expiraEm"));
        return alteracao;
    }
}
