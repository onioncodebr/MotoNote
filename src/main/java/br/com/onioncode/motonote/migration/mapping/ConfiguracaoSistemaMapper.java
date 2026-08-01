package br.com.onioncode.motonote.migration.mapping;

import br.com.onioncode.motonote.domain.ConfiguracaoSistema;
import org.bson.Document;

public class ConfiguracaoSistemaMapper {

    public ConfiguracaoSistema map(Document doc) {
        ConfiguracaoSistema config = new ConfiguracaoSistema();
        config.setId(MongoDocumentUtils.id(doc));
        config.setTrialDaysOverride(doc.getInteger("trialDaysOverride"));
        config.setCadastroPublicoHabilitado(doc.getBoolean("cadastroPublicoHabilitado"));
        config.setRateLimitLoginMaxTentativas(doc.getInteger("rateLimitLoginMaxTentativas"));
        config.setRateLimitGeralMaxTentativas(doc.getInteger("rateLimitGeralMaxTentativas"));
        config.setBannerHabilitado(doc.getBoolean("bannerHabilitado", false));
        config.setBannerMensagem(doc.getString("bannerMensagem"));
        config.setContatoSuporteWhatsapp(doc.getString("contatoSuporteWhatsapp"));
        config.setContatoSuporteEmail(doc.getString("contatoSuporteEmail"));
        config.setPopupHabilitado(doc.getBoolean("popupHabilitado", false));
        config.setPopupTitulo(doc.getString("popupTitulo"));
        config.setPopupDescricao(doc.getString("popupDescricao"));
        config.setPopupBotaoTexto(doc.getString("popupBotaoTexto"));
        config.setPopupBotaoUrl(doc.getString("popupBotaoUrl"));
        config.setPopupVersao(doc.getInteger("popupVersao", 0));
        config.setAtualizadoEm(MongoDocumentUtils.toInstant(doc, "atualizadoEm"));
        config.setAtualizadoPor(doc.getString("atualizadoPor"));
        return config;
    }
}
