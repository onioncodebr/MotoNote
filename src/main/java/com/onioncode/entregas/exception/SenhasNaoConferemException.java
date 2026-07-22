package com.onioncode.entregas.exception;

public class SenhasNaoConferemException extends RuntimeException {
    public SenhasNaoConferemException() {
        super("As senhas informadas não conferem.");
    }
}
