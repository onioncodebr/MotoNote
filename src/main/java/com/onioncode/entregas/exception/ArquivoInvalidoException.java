package com.onioncode.entregas.exception;

public class ArquivoInvalidoException extends RuntimeException {
    public ArquivoInvalidoException(String motivo) {
        super(motivo);
    }
}
