package br.com.onioncode.motonote.exception;

public class ValeNotFoundException extends RuntimeException {
    public ValeNotFoundException() {
        super("Vale não encontrado.");
    }
}
