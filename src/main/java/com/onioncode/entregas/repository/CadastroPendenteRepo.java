package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.CadastroPendente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CadastroPendenteRepo extends MongoRepository<CadastroPendente, String> {
    Optional<CadastroPendente> findByEmail(String email);
    void deleteByEmail(String email);
}
