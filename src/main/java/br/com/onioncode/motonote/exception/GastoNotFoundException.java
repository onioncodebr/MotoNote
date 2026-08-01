package br.com.onioncode.motonote.exception;

public class GastoNotFoundException extends RuntimeException {
    public GastoNotFoundException() {
        super("Gasto não encontrado.");
    }
}
