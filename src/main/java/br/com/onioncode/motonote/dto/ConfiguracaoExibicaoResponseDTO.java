package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// Subconjunto de ConfiguracaoSistema seguro pra expor a qualquer usuário
// autenticado (não só MASTER) — nunca inclui limites de rate limit ou dias
// de trial (isso continua só em ConfiguracaoSistemaResponseDTO, MASTER-only).
@Data
@AllArgsConstructor
public class ConfiguracaoExibicaoResponseDTO {

    private boolean bannerHabilitado;
    private String bannerMensagem;

    private boolean popupHabilitado;
    private String popupTitulo;
    private String popupDescricao;
    private String popupBotaoTexto;
    private String popupBotaoUrl;
    private int popupVersao;

    private String contatoSuporteWhatsapp;
    private String contatoSuporteEmail;
}
