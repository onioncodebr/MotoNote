package com.onioncode.entregas.exception;

public class EmailIndisponivelException extends RuntimeException {
    public EmailIndisponivelException(String motivo) {
        super("Não foi possível enviar o e-mail: " + motivo);
    }
}
