package com.onioncode.entregas.exception;

public class IntervaloDataInvalidoException extends RuntimeException {
    public IntervaloDataInvalidoException() {
        super("A data de início não pode ser depois da data de fim.");
    }

    public IntervaloDataInvalidoException(String message) {
        super(message);
    }
}
