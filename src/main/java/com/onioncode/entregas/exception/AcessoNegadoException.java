package com.onioncode.entregas.exception;

public class AcessoNegadoException extends RuntimeException {
    public AcessoNegadoException() {
        super("Você não tem permissão para acessar ou modificar este recurso.");
    }
}