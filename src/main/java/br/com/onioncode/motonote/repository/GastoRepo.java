package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Gasto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface GastoRepo extends JpaRepository<Gasto, String> {

    // Usado pra checar posse antes de editar/excluir (só o próprio motoboy
    // pode mexer no gasto que ele mesmo registrou).
    Optional<Gasto> findByIdAndMotoboyId(String id, String motoboyId);

    Page<Gasto> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Gasto> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Variantes filtradas por período. Em JPA/Postgres, LocalDate mapeia
    // nativamente pra DATE, sem a conversão manual de UTC que existia com o
    // Mongo (ver antigo MongoConfig).
    Page<Gasto> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive, Pageable pageable);

    Page<Gasto> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    List<Gasto> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive);

    List<Gasto> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive);
}
