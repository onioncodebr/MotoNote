package com.onioncode.entregas.exception;

public class PagamentoIndisponivelException extends RuntimeException {
    public PagamentoIndisponivelException(String motivo) {
        super("Não foi possível concluir a operação de pagamento: " + motivo);
    }
}
