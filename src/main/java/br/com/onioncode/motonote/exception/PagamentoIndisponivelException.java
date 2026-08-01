package br.com.onioncode.motonote.exception;

public class PagamentoIndisponivelException extends RuntimeException {
    public PagamentoIndisponivelException(String motivo) {
        super("Não foi possível concluir a operação de pagamento: " + motivo);
    }
}
