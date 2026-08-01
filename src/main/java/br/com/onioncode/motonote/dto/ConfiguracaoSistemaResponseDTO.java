package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConfiguracaoSistemaResponseDTO {

    // Valor efetivo (override se existir, senão o padrão do properties).
    private int trialDays;

    private boolean cadastroPublicoHabilitado;

    private int rateLimitLoginMaxTentativas;
    private int rateLimitGeralMaxTentativas;

    private boolean bannerHabilitado;
    private String bannerMensagem;

    private String contatoSuporteWhatsapp;
    private String contatoSuporteEmail;

    private boolean popupHabilitado;
    private String popupTitulo;
    private String popupDescricao;
    private String popupBotaoTexto;
    private String popupBotaoUrl;
    private int popupVersao;

    private boolean notificacaoCadastroHabilitado;
    private String notificacaoCadastroEmail;
}
