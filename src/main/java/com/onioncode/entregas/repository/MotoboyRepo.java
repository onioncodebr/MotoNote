package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Motoboy;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface MotoboyRepo extends MongoRepository<Motoboy, String> {


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
}
