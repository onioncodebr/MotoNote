package com.onioncode.entregas.exception;

public class SenhaInvalidaException extends RuntimeException {

    public SenhaInvalidaException() {
        super("Senha incorreta.");
    }
}
