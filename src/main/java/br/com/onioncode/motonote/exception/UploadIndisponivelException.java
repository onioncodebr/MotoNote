package br.com.onioncode.motonote.exception;

public class UploadIndisponivelException extends RuntimeException {
    public UploadIndisponivelException(String motivo) {
        super("Não foi possível enviar a imagem: " + motivo);
    }
}
