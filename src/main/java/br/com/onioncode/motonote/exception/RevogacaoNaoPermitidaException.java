package br.com.onioncode.motonote.exception;

public class RevogacaoNaoPermitidaException extends RuntimeException {
    public RevogacaoNaoPermitidaException() {
        super("Esta assinatura tem cobrança ativa no Stripe; cancele por lá em vez de revogar pelo painel.");
    }
}
