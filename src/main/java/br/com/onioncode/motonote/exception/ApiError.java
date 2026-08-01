package br.com.onioncode.motonote.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

// Formato único de erro pra TODA a API (ver melhorias.md 1.3) — antes,
// alguns handlers (validação de @Valid, e-mail duplicado, senha não
// confere) devolviam um Map<String,String> solto em vez deste objeto,
// forçando o frontend a adivinhar o formato da resposta. Agora esses casos
// também usam ApiError, só preenchendo fieldErrors além do message.
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {

    private final LocalDateTime timestamp;
    private final Integer status;
    private final String error;
    private final String message;
    private final String path;
    // Só preenchido em erros de validação por campo — chave = nome do
    // campo, valor = mensagem. Null (omitido do JSON) em qualquer outro
    // erro, pra não poluir o payload dos ~90% dos erros que não são disso.
    private final Map<String, String> fieldErrors;

    // Construtor original, mantido pra não quebrar as dezenas de call
    // sites já existentes que não lidam com erro de campo.
    public ApiError(LocalDateTime timestamp, Integer status, String error, String message, String path) {
        this(timestamp, status, error, message, path, null);
    }

    public ApiError(LocalDateTime timestamp, Integer status, String error, String message, String path,
                     Map<String, String> fieldErrors) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
        this.fieldErrors = fieldErrors;
    }

}
