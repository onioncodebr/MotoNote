package br.com.onioncode.motonote.exception;

public class ArquivoInvalidoException extends RuntimeException {
    public ArquivoInvalidoException(String motivo) {
        super(motivo);
    }
}
