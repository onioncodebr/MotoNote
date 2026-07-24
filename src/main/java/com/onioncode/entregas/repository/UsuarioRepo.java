package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepo extends MongoRepository<Usuario, String> {
    Optional<Usuario> findByEmail(String email);


    boolean existsByEmail(String email);

    // Usada pela listagem paginada (MASTER) quando um filtro de status de
    // assinatura está ativo — ver AssinaturaRepo.findByStatus.
    Page<Usuario> findByIdIn(List<String> ids, Pageable pageable);

    // Contagem/listagem de tenants excluindo o próprio MASTER (que não é
    // assinante) — usado pelas métricas do SaaS e pela listagem admin de
    // assinaturas.
    long countByRoleNot(Role role);

    Page<Usuario> findByRoleNot(Role role, Pageable pageable);

    // Busca textual (nome ou e-mail) pra listagem admin de Usuários, usada
    // quando não há filtro de status ativo. Só toca campos de texto simples
    // (name/email) — de propósito não combina isso com um "_id: {$in: ...}"
    // num @Query cru: a conversão automática de String pra ObjectId que o
    // Spring Data aplica em métodos derivados (ex.: findByIdIn) não é
    // garantida da mesma forma dentro de um array $in escrito à mão num
    // @Query; o caso combinado (status + busca) é resolvido em memória em
    // UsuarioService, reaproveitando o findByIdIn existente.
    @Query("{ '$or': [ { 'name': { $regex: ?0, $options: 'i' } }, { 'email': { $regex: ?0, $options: 'i' } } ] }")
    Page<Usuario> findByNomeOuEmailContaining(String termo, Pageable pageable);

    // "Usuários ativos agora" no Painel Master — ver Usuario.ultimoAcessoEm.
    long countByUltimoAcessoEmAfter(Instant limite);

    // Série "novos cadastros por dia" — exclui MASTER pela mesma razão de
    // countByRoleNot (não é um tenant/assinante).
    List<Usuario> findByRoleNotAndCreatedAtBetween(Role role, Instant inicio, Instant fimExclusivo);
}
