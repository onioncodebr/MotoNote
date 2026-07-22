package com.onioncode.entregas.exception;

public class MotoboyNameIgualException extends RuntimeException {
    public MotoboyNameIgualException(String name) {
        super("Você já tem outro motoboy chamado '" + name + "'.");
    }
}
