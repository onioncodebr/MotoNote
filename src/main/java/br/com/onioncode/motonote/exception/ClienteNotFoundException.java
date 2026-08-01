package br.com.onioncode.motonote.exception;

public class ClienteNotFoundException extends RuntimeException {
    public ClienteNotFoundException() {
        super("Cliente não encontrado ou não pertence a este usuário.");
    }
}
