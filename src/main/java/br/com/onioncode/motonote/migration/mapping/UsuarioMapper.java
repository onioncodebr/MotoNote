package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.ModoValorPedidoObrigatorio;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.Usuario;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UsuarioMapper {

    private static final Logger log = LoggerFactory.getLogger(UsuarioMapper.class);

    public Usuario map(Document doc) {
        Usuario usuario = new Usuario();
        usuario.setId(MongoDocumentUtils.id(doc));
        usuario.setName(doc.getString("name"));
        usuario.setEmail(doc.getString("email"));
        usuario.setPassword(doc.getString("password"));
        usuario.setRole(MongoDocumentUtils.toEnum(doc, "role", Role.class, log));
        usuario.setPhone(doc.getString("phone"));
        usuario.setCreatedAt(MongoDocumentUtils.toInstant(doc, "createdAt"));
        usuario.setFotoUrl(doc.getString("fotoUrl"));
        usuario.setAtivo(doc.getBoolean("ativo", true));
        usuario.setUltimoAcessoEm(MongoDocumentUtils.toInstant(doc, "ultimoAcessoEm"));
        usuario.setModoValorPedidoObrigatorio(
                MongoDocumentUtils.toEnum(doc, "modoValorPedidoObrigatorio", ModoValorPedidoObrigatorio.class, log));
        usuario.setPermitirDadosCliente(doc.getBoolean("permitirDadosCliente", false));
        usuario.setControleFluxoEntregaHabilitado(doc.getBoolean("controleFluxoEntregaHabilitado", false));
        usuario.setPermitirCadastroClientes(doc.getBoolean("permitirCadastroClientes", false));
        usuario.setBaixaAutomaticaAoEntregar(doc.getBoolean("baixaAutomaticaAoEntregar", false));
        usuario.setMostrarFaturamentoPedidos(doc.getBoolean("mostrarFaturamentoPedidos", false));
        return usuario;
    }
}
