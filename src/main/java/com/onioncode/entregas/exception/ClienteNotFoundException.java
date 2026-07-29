package com.onioncode.entregas.exception;

public class ClienteNotFoundException extends RuntimeException {
    public ClienteNotFoundException() {
        super("Cliente não encontrado ou não pertence a este usuário.");
    }
}
