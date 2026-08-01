package br.com.onioncode.motonote.exception;

public class ObservacaoObrigatoriaException extends RuntimeException {
    public ObservacaoObrigatoriaException() {
        super("A observação é obrigatória quando o status é 'Não foi possível entregar'.");
    }
}
