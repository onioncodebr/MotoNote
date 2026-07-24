package com.onioncode.entregas.exception;

public class CaptchaInvalidoException extends RuntimeException {
    public CaptchaInvalidoException() {
        super("Verificação de segurança falhou. Tente novamente.");
    }
}
