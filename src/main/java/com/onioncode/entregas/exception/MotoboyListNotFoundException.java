package com.onioncode.entregas.exception;

public class MotoboyListNotFoundException extends RuntimeException{
    public MotoboyListNotFoundException(){
        super("Nenhum motoboy encontrado para o usuario");
    }
}
