package com.onioncode.entregas.exception;

public class UsuarioNotFoundException extends RuntimeException{

    public UsuarioNotFoundException(String id){
        super("Usuario com o id '" + id + "' não encontrado");
    }
}
