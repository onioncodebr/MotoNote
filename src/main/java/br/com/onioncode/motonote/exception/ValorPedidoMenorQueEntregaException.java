package br.com.onioncode.motonote.exception;

public class ValorPedidoMenorQueEntregaException extends RuntimeException {
    public ValorPedidoMenorQueEntregaException() {
        super("O valor do pedido deve ser maior que o valor da entrega.");
    }
}
