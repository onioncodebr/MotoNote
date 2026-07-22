package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepo extends MongoRepository<Usuario, String> {
    Optional<Usuario> findByEmail(String email);


    boolean existsByEmail(String email);

    // Usada pela listagem paginada (MASTER) quando um filtro de status de
    // assinatura está ativo — ver AssinaturaRepo.findByStatus.
    Page<Usuario> findByIdIn(List<String> ids, Pageable pageable);
}
