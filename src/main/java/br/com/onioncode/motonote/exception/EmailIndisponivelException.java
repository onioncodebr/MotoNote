package br.com.onioncode.motonote.exception;

public class EmailIndisponivelException extends RuntimeException {
    public EmailIndisponivelException(String motivo) {
        super("Não foi possível enviar o e-mail: " + motivo);
    }
}
