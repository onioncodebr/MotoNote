package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Motoboy;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface MotoboyRepo extends JpaRepository<Motoboy, String> {


    List<Motoboy> findByUsuarioId(String id);

    // Versão paginada da mesma consulta, pra listagem de gerenciamento (tela
    // de Motoboys) — findByUsuarioId sem paginação continua existindo pros
    // usos de dropdown/lookup (Entregas, Relatórios, Visão geral), que
    // precisam da lista inteira de uma vez.
    Page<Motoboy> findByUsuarioId(String id, Pageable pageable);

    Optional<Motoboy> findByNameIgnoreCaseAndUsuarioId(String name, String usuarioId);

    Optional<Motoboy> findByIdAndUsuarioId(@NotBlank String id, String UsuarioId);

    Optional<Motoboy> findByEmail(String email);

    boolean existsByEmail(String email);

    // Busca server-side pra listagem global de motoboys (MASTER) — sem isso
    // um filtro só no frontend seria inconsistente com a paginação (o item
    // buscado pode estar em outra página).
    Page<Motoboy> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
