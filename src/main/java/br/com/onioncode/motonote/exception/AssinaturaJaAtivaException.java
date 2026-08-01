package br.com.onioncode.motonote.exception;

public class AssinaturaJaAtivaException extends RuntimeException {
    public AssinaturaJaAtivaException() {
        super("Você já tem uma assinatura ativa ou em período de teste.");
    }
}
