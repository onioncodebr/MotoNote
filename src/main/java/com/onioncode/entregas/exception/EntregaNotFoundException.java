package com.onioncode.entregas.exception;

public class EntregaNotFoundException extends RuntimeException {
    public EntregaNotFoundException() {
        super("Entrega não encontrada no sistema.");
    }
}