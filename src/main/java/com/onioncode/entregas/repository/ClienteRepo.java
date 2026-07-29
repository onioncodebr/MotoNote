package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClienteRepo extends MongoRepository<Cliente, String> {

    // Lista completa do tenant — usada pra resolver nome no frontend
    // (autocomplete/coluna "Cliente" da tabela de Entregas) e como base do
    // ranking quando não há filtro de busca. A paginação/ordenação do
    // ranking acontece em memória em ClienteService (depende de campos
    // calculados que não existem neste documento), não aqui.
    List<Cliente> findByUsuarioId(String usuarioId);

    // Busca por nome OU telefone — usada tanto no autocomplete do formulário
    // de Entrega quanto no filtro da tela de Clientes. O termo já chega
    // escapado (Pattern.quote, feito em ClienteService) pra tratar como
    // texto literal, não regex — mesmo padrão de
    // UsuarioRepo.findByNomeOuEmailContaining.
    @Query("{ '$or': [ { 'nome': { $regex: ?0, $options: 'i' } }, { 'telefone': { $regex: ?0, $options: 'i' } } ], 'usuarioId': ?1 }")
    List<Cliente> findByNomeOuTelefoneContainingAndUsuarioId(String termo, String usuarioId);

    Optional<Cliente> findByIdAndUsuarioId(String id, String usuarioId);
}
