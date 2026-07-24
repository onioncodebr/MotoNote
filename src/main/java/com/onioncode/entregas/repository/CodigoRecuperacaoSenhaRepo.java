package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.CodigoRecuperacaoSenha;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CodigoRecuperacaoSenhaRepo extends MongoRepository<CodigoRecuperacaoSenha, String> {
    Optional<CodigoRecuperacaoSenha> findByEmail(String email);
    void deleteByEmail(String email);
}
