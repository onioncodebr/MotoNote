package com.onioncode.entregas.exception;

public class GastoNotFoundException extends RuntimeException {
    public GastoNotFoundException() {
        super("Gasto não encontrado.");
    }
}
