package br.com.onioncode.motonote.exception;

public class CadastroDesabilitadoException extends RuntimeException {
    public CadastroDesabilitadoException() {
        super("Novos cadastros estão temporariamente desabilitados.");
    }
}
