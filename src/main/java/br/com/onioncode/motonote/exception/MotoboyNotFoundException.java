package br.com.onioncode.motonote.exception;

public class MotoboyNotFoundException extends RuntimeException {
    public MotoboyNotFoundException() {
        super("Motoboy não encontrado ou não pertence a este usuário.");
    }
}