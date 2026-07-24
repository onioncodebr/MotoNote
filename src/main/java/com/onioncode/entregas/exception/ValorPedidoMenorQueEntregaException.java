package com.onioncode.entregas.exception;

public class ValorPedidoMenorQueEntregaException extends RuntimeException {
    public ValorPedidoMenorQueEntregaException() {
        super("O valor do pedido deve ser maior que o valor da entrega.");
    }
}
