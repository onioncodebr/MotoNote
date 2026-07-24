package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Vale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface ValeRepo extends MongoRepository<Vale, String> {

    Page<Vale> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Vale> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Variantes filtradas por período — mesmo motivo do EntregaRepo: o
    // conversor de data customizado (MongoConfig) não é aplicado
    // automaticamente pelo Spring Data ao converter parâmetros de query.
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Vale> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Vale> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Vale> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc);

    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Vale> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc);
}
