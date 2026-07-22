package com.onioncode.entregas.exception;

public class AssinaturaNaoEncontradaException extends RuntimeException {
    public AssinaturaNaoEncontradaException() {
        super("Assinatura não encontrada para este usuário.");
    }
}
