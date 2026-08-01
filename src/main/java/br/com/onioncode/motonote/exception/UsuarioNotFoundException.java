package br.com.onioncode.motonote.exception;

public class UsuarioNotFoundException extends RuntimeException{

    public UsuarioNotFoundException(String id){
        super("Usuario com o id '" + id + "' não encontrado");
    }
}
