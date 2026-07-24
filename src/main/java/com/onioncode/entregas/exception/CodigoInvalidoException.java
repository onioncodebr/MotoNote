package com.onioncode.entregas.exception;

// Cobre código errado, expirado ou com tentativas esgotadas — de propósito
// sem diferenciar a mensagem entre esses três casos (ver CadastroService/
// RecuperacaoSenhaService/UsuarioService), pra não dar informação extra a
// quem está tentando adivinhar um código alheio.
public class CodigoInvalidoException extends RuntimeException {
    public CodigoInvalidoException() {
        super("Código inválido ou expirado.");
    }
}
