package br.com.onioncode.motonote.exception;

public class MotoboyNameIgualException extends RuntimeException {
    public MotoboyNameIgualException(String name) {
        super("Você já tem outro motoboy chamado '" + name + "'.");
    }
}
