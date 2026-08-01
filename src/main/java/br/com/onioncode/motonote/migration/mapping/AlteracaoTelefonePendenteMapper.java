package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.AlteracaoTelefonePendente;
import org.bson.Document;

public class AlteracaoTelefonePendenteMapper {

    public AlteracaoTelefonePendente map(Document doc) {
        AlteracaoTelefonePendente alteracao = new AlteracaoTelefonePendente();
        alteracao.setId(MongoDocumentUtils.id(doc));
        alteracao.setUsuarioId(doc.getString("usuarioId"));
        alteracao.setNovoTelefone(doc.getString("novoTelefone"));
        alteracao.setCodigoHash(doc.getString("codigoHash"));
        alteracao.setTentativas(doc.getInteger("tentativas", 0));
        alteracao.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        alteracao.setExpiraEm(MongoDocumentUtils.toInstant(doc, "expiraEm"));
        return alteracao;
    }
}
