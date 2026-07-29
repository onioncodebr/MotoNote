package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.TipoVisitaPagina;
import com.onioncode.entregas.domain.VisitaPagina;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VisitaPaginaRepo extends MongoRepository<VisitaPagina, String> {
    long countByTipo(TipoVisitaPagina tipo);
}
