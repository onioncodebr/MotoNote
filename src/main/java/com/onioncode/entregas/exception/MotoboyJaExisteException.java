package com.onioncode.entregas.exception;

public class MotoboyJaExisteException extends RuntimeException {
    public MotoboyJaExisteException(String name) {
        super("Não é possivel criar um motoboy com o mesmo nome '" + name +"'.");
    }
}
