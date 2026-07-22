package com.onioncode.entregas.exception;

public class SenhaAtualIncorretaException extends RuntimeException{

    public SenhaAtualIncorretaException(String userName){
        super("Senha atual invalida para o usuario: " + userName);
    }
}
