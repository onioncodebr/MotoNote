package br.com.onioncode.motonote.util;

import java.security.SecureRandom;

// Compartilhado entre os três fluxos que dependem de um código de 6 dígitos
// enviado por e-mail (cadastro, recuperação de senha, troca de telefone) —
// ver CadastroService/RecuperacaoSenhaService/UsuarioService. SecureRandom
// (não Math.random/Random) porque o código funciona como uma credencial de
// curta duração.
public final class CodigoUtils {

    private static final SecureRandom RANDOM = new SecureRandom();

    private CodigoUtils() {
    }

    public static String gerarCodigo() {
        int valor = RANDOM.nextInt(1_000_000);
        return String.format("%06d", valor);
    }
}
