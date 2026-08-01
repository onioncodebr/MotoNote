package br.com.onioncode.motonote.exception;

public class CaptchaInvalidoException extends RuntimeException {
    public CaptchaInvalidoException() {
        super("Verificação de segurança falhou. Tente novamente.");
    }
}
