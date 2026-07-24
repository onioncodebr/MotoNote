package com.onioncode.entregas.exception;

public class CadastroDesabilitadoException extends RuntimeException {
    public CadastroDesabilitadoException() {
        super("Novos cadastros estão temporariamente desabilitados.");
    }
}
