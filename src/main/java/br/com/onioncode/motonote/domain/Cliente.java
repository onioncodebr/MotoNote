package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Cliente final da conta (quem recebe as entregas) — diferente de Usuario
// (o dono/tenant do SaaS). Cadastro opcional, ligado por
// Usuario.permitirCadastroClientes (ver fluxo-entrega-configuracoes.md).
// Sem login/senha — Cliente nunca acessa o sistema.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cliente")
public class Cliente extends EntidadeComIdAssinalavel {

    private String nome;
    private String telefone;

    // Endereço estruturado (em vez de um campo único) — rua/numero/bairro/
    // cidade obrigatórios, complemento opcional.
    private String rua;
    private String numero;
    private String bairro;
    private String cidade;
    private String complemento;

    // Tenant — mesmo padrão de Motoboy.usuarioId, indexado (ver V3__cliente.sql).
    private String usuarioId;

    private Instant criadoEm;
}
