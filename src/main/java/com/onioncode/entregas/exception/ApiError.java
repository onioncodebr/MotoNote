package com.onioncode.entregas.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;


@AllArgsConstructor
@Getter
public class ApiError {

    private LocalDateTime timestamp;
    private Integer status;
    private String error;
    private String message;
    private String path;

}
