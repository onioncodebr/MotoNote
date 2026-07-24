package com.onioncode.entregas.exception;

public class ValeNotFoundException extends RuntimeException {
    public ValeNotFoundException() {
        super("Vale não encontrado.");
    }
}
