package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.Cliente;
import org.bson.Document;

public class ClienteMapper {

    public Cliente map(Document doc) {
        Cliente cliente = new Cliente();
        cliente.setId(MongoDocumentUtils.id(doc));
        cliente.setNome(doc.getString("nome"));
        cliente.setTelefone(doc.getString("telefone"));
        cliente.setRua(doc.getString("rua"));
        cliente.setNumero(doc.getString("numero"));
        cliente.setBairro(doc.getString("bairro"));
        cliente.setCidade(doc.getString("cidade"));
        cliente.setComplemento(doc.getString("complemento"));
        cliente.setUsuarioId(doc.getString("usuarioId"));
        cliente.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        return cliente;
    }
}
