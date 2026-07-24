package com.onioncode.entregas.exception;

public class ValorPedidoObrigatorioException extends RuntimeException {
    public ValorPedidoObrigatorioException() {
        super("O valor do pedido é obrigatório quando a forma de pagamento é Dinheiro.");
    }
}
