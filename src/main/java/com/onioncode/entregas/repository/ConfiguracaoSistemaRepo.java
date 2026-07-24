package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.ConfiguracaoSistema;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracaoSistemaRepo extends MongoRepository<ConfiguracaoSistema, String> {
}
