package com.onioncode.entregas.exception;

public class EntregaNaoPendenteException extends RuntimeException {
    public EntregaNaoPendenteException() {
        super("Essa entrega não está pendente de recebimento em dinheiro.");
    }
}
