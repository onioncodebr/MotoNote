package br.com.onioncode.motonote.exception;

public class EmailJaCadastradoException extends RuntimeException{
    public EmailJaCadastradoException(String email){
        super("Usuario ja cadastrado com o email: " + email);
    }
}
