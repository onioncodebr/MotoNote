package com.onioncode.entregas.exception;

public class EmailJaCadastradoException extends RuntimeException{
    public EmailJaCadastradoException(String email){
        super("Usuario ja cadastrado com o email: " + email);
    }
}
