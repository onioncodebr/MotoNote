package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.Assinatura;
import br.com.onioncode.motonote.domain.StatusAssinatura;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AssinaturaMapper {

    private static final Logger log = LoggerFactory.getLogger(AssinaturaMapper.class);

    public Assinatura map(Document doc) {
        Assinatura assinatura = new Assinatura();
        assinatura.setId(MongoDocumentUtils.id(doc));
        assinatura.setUsuarioId(doc.getString("usuarioId"));
        assinatura.setStripeCustomerId(doc.getString("stripeCustomerId"));
        assinatura.setStripeSubscriptionId(doc.getString("stripeSubscriptionId"));
        assinatura.setStatus(MongoDocumentUtils.toEnum(doc, "status", StatusAssinatura.class, log));
        assinatura.setTrialTerminaEm(MongoDocumentUtils.toInstant(doc, "trialTerminaEm"));
        assinatura.setPeriodoAtualTerminaEm(MongoDocumentUtils.toInstant(doc, "periodoAtualTerminaEm"));
        assinatura.setCriadoEm(MongoDocumentUtils.toInstant(doc, "criadoEm"));
        assinatura.setAtualizadoEm(MongoDocumentUtils.toInstant(doc, "atualizadoEm"));
        assinatura.setTrialTerminaEmAvisado(MongoDocumentUtils.toInstant(doc, "trialTerminaEmAvisado"));
        return assinatura;
    }
}
