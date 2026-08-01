package br.com.onioncode.motonote.exception;

public class SenhasNaoConferemException extends RuntimeException {
    public SenhasNaoConferemException() {
        super("As senhas informadas não conferem.");
    }
}
