package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.StatusVale;
import br.com.onioncode.motonote.domain.Vale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ValeRepo extends JpaRepository<Vale, String> {

    Page<Vale> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Vale> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Variantes filtradas por período. Em JPA/Postgres, LocalDate mapeia
    // nativamente pra DATE, sem a conversão manual de UTC que existia com o
    // Mongo (ver antigo MongoConfig).
    Page<Vale> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive, Pageable pageable);

    Page<Vale> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive, Pageable pageable);

    // Mesmas variantes acima, com filtro de status adicional — usadas pela
    // aba Vales quando o usuário escolhe "Pendente" ou "Concluído" em vez de
    // "Todos" (ver ValeService.findAllByUserPaged).
    Page<Vale> findByMotoboyIdAndStatusAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, StatusVale status, LocalDate start, LocalDate endExclusive, Pageable pageable);

    Page<Vale> findByMotoboyIdInAndStatusAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, StatusVale status, LocalDate start, LocalDate endExclusive, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    List<Vale> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive);

    List<Vale> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive);
}
