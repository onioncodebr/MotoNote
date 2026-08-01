package br.com.onioncode.motonote.exception;

public class SenhaInvalidaException extends RuntimeException {

    public SenhaInvalidaException() {
        super("Senha incorreta.");
    }
}
