package br.com.onioncode.motonote.exception;

public class EntregaNotFoundException extends RuntimeException {
    public EntregaNotFoundException() {
        super("Entrega não encontrada no sistema.");
    }
}