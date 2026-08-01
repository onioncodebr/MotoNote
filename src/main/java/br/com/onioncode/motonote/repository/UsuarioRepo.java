package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepo extends JpaRepository<Usuario, String> {
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
    // quando não há filtro de status ativo. ILIKE é case-insensitive nativo
    // do Postgres, equivalente ao $regex com $options:'i' que existia no
    // Mongo. O caso combinado (status + busca) continua resolvido em
    // memória em UsuarioService, reaproveitando o findByIdIn existente.
    @Query("SELECT u FROM Usuario u WHERE u.name ILIKE CONCAT('%', :termo, '%') OR u.email ILIKE CONCAT('%', :termo, '%')")
    Page<Usuario> findByNomeOuEmailContaining(@Param("termo") String termo, Pageable pageable);

    // "Usuários ativos agora" no Painel Master — ver Usuario.ultimoAcessoEm.
    long countByUltimoAcessoEmAfter(Instant limite);

    // Série "novos cadastros por dia" — exclui MASTER pela mesma razão de
    // countByRoleNot (não é um tenant/assinante).
    List<Usuario> findByRoleNotAndCreatedAtBetween(Role role, Instant inicio, Instant fimExclusivo);
}
