package br.com.onioncode.motonote.exception;

public class MotoboyListNotFoundException extends RuntimeException{
    public MotoboyListNotFoundException(){
        super("Nenhum motoboy encontrado para o usuario");
    }
}
