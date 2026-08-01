package br.com.onioncode.motonote.exception;

public class DadosClienteObrigatoriosException extends RuntimeException {
    public DadosClienteObrigatoriosException() {
        super("O nome do cliente e a descrição do pedido são obrigatórios.");
    }
}
