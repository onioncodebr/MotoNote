package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.AlteracaoSenhaPendente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AlteracaoSenhaPendenteRepo extends MongoRepository<AlteracaoSenhaPendente, String> {
    Optional<AlteracaoSenhaPendente> findByUsuarioId(String usuarioId);
    void deleteByUsuarioId(String usuarioId);
}
