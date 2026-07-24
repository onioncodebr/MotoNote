package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Cadastro público ainda não confirmado — só vira um Usuario de verdade
// quando o código é validado (ver CadastroService.confirmarCadastro). A
// senha já chega com hash (não é reencodada na confirmação); o código
// também é guardado com hash, nunca em texto puro. TTL index em expiraEm:
// o Mongo apaga o documento sozinho depois que o código vence, sem precisar
// de job de limpeza.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "cadastros_pendentes")
public class CadastroPendente {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String name;
    private String phone;
    private String senhaHash;
    private String codigoHash;
    private int tentativas;

    private Instant criadoEm;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiraEm;
}
