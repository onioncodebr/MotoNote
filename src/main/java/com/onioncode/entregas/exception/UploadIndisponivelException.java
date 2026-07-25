package com.onioncode.entregas.exception;

public class UploadIndisponivelException extends RuntimeException {
    public UploadIndisponivelException(String motivo) {
        super("Não foi possível enviar a imagem: " + motivo);
    }
}
