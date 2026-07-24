package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.AlteracaoTelefonePendente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AlteracaoTelefonePendenteRepo extends MongoRepository<AlteracaoTelefonePendente, String> {
    Optional<AlteracaoTelefonePendente> findByUsuarioId(String usuarioId);
    void deleteByUsuarioId(String usuarioId);
}
