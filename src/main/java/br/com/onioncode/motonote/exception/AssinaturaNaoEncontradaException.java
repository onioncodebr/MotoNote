package br.com.onioncode.motonote.exception;

public class AssinaturaNaoEncontradaException extends RuntimeException {
    public AssinaturaNaoEncontradaException() {
        super("Assinatura não encontrada para este usuário.");
    }
}
