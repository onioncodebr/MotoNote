package br.com.onioncode.motonote.exception;

public class ValorPedidoObrigatorioException extends RuntimeException {
    public ValorPedidoObrigatorioException() {
        super("O valor do pedido é obrigatório quando a forma de pagamento é Dinheiro.");
    }
}
