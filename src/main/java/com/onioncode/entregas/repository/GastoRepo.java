package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Gasto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface GastoRepo extends MongoRepository<Gasto, String> {

    // Usado pra checar posse antes de editar/excluir (só o próprio motoboy
    // pode mexer no gasto que ele mesmo registrou).
    Optional<Gasto> findByIdAndMotoboyId(String id, String motoboyId);

    Page<Gasto> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Gasto> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Variantes filtradas por período — mesmo motivo do EntregaRepo: o
    // conversor de data customizado (MongoConfig) não é aplicado
    // automaticamente pelo Spring Data ao converter parâmetros de query.
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Gasto> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Gasto> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Gasto> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc);

    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Gasto> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc);
}
