package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.Entrega;
import br.com.onioncode.motonote.domain.FormaPagamento;
import br.com.onioncode.motonote.domain.StatusLogisticoEntrega;
import br.com.onioncode.motonote.domain.StatusRecebimento;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class EntregaMapper {

    private static final Logger log = LoggerFactory.getLogger(EntregaMapper.class);

    public Entrega map(Document doc) {
        Entrega entrega = new Entrega();
        entrega.setId(MongoDocumentUtils.id(doc));
        entrega.setValue(MongoDocumentUtils.toDouble(doc, "value"));
        entrega.setLocalDate(MongoDocumentUtils.toLocalDate(doc, "localDate"));
        entrega.setMotoboyId(doc.getString("motoboyId"));
        entrega.setFormaPagamento(MongoDocumentUtils.toEnum(doc, "formaPagamento", FormaPagamento.class, log));
        entrega.setStatus(MongoDocumentUtils.toEnum(doc, "status", StatusRecebimento.class, log));
        entrega.setValorPedido(MongoDocumentUtils.toDouble(doc, "valorPedido"));
        entrega.setNomeCliente(doc.getString("nomeCliente"));
        entrega.setDescricaoPedido(doc.getString("descricaoPedido"));
        entrega.setClienteId(doc.getString("clienteId"));
        entrega.setStatusLogistico(MongoDocumentUtils.toEnum(doc, "statusLogistico", StatusLogisticoEntrega.class, log));
        entrega.setObservacaoNaoEntregue(doc.getString("observacaoNaoEntregue"));
        return entrega;
    }
}
