package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Cliente final da conta (quem recebe as entregas) — diferente de Usuario
// (o dono/tenant do SaaS). Cadastro opcional, ligado por
// Usuario.permitirCadastroClientes (ver fluxo-entrega-configuracoes.md).
// Sem login/senha — Cliente nunca acessa o sistema.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "cliente")
public class Cliente {

    @Id
    private String id;
    private String nome;
    private String telefone;

    // Endereço estruturado (em vez de um campo único) — rua/numero/bairro/
    // cidade obrigatórios, complemento opcional.
    private String rua;
    private String numero;
    private String bairro;
    private String cidade;
    private String complemento;

    // Tenant — mesmo padrão de Motoboy.usuarioId.
    @Indexed
    private String usuarioId;

    private Instant criadoEm;
}
