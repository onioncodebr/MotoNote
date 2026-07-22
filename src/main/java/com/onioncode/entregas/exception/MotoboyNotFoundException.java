package com.onioncode.entregas.exception;

public class MotoboyNotFoundException extends RuntimeException {
    public MotoboyNotFoundException() {
        super("Motoboy não encontrado ou não pertence a este usuário.");
    }
}