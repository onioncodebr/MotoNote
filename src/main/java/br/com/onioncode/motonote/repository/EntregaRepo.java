package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Entrega;
import br.com.onioncode.motonote.domain.StatusLogisticoEntrega;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EntregaRepo extends JpaRepository<Entrega, String> {
    List<Entrega> findByMotoboyId(String motoboyId);

    List<Entrega> findByMotoboyIdIn(List<String> motoboyIds);

    // Variantes paginadas das mesmas queries acima, usadas pela aba
    // "Entregas" (lista simples, sem filtro de data) pra não trazer o
    // histórico inteiro de uma vez em contas com alto volume.
    Page<Entrega> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Entrega> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Busca entregas de um motoboy em uma data específica. Em JPA/Postgres,
    // LocalDate mapeia nativamente pra DATE, sem a armadilha de timezone que
    // existia no driver Mongo (ver antigo MongoConfig) — não precisa mais de
    // conversão manual pra início do dia em UTC.
    List<Entrega> findByMotoboyIdAndLocalDate(String motoboyId, LocalDate localDate);

    // Busca entregas de uma lista de motoboys em uma data específica
    List<Entrega> findByMotoboyIdInAndLocalDate(List<String> motoboyIds, LocalDate localDate);

    // Busca entregas de UM motoboy em um período (semana, mês, ano)
    List<Entrega> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive);

    // Busca entregas de TODOS os motoboys do usuário em um período
    List<Entrega> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive);

    // Variantes paginadas das duas queries acima, usadas pela tabela dos
    // Relatórios na tela (o export continua usando as versões sem
    // paginação, que trazem o período inteiro de uma vez).
    Page<Entrega> findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, LocalDate start, LocalDate endExclusive, Pageable pageable);

    Page<Entrega> findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, LocalDate start, LocalDate endExclusive, Pageable pageable);

    // Pendências de recebimento em dinheiro — entregas antigas (gravadas antes
    // de formaPagamento/status existirem) não têm esses campos, então nunca
    // batem com esse filtro e ficam de fora automaticamente.
    // Versões paginadas, usadas pela tabela da aba "Valores Pendentes".
    @Query("SELECT e FROM Entrega e WHERE e.motoboyId = :motoboyId AND e.formaPagamento = 'DINHEIRO' AND e.status = 'PENDENTE' AND e.localDate >= :start AND e.localDate < :endExclusive")
    Page<Entrega> findPendentesByMotoboyIdAndLocalDateBetween(
            @Param("motoboyId") String motoboyId, @Param("start") LocalDate start,
            @Param("endExclusive") LocalDate endExclusive, Pageable pageable);

    @Query("SELECT e FROM Entrega e WHERE e.motoboyId IN :motoboyIds AND e.formaPagamento = 'DINHEIRO' AND e.status = 'PENDENTE' AND e.localDate >= :start AND e.localDate < :endExclusive")
    Page<Entrega> findPendentesByMotoboyIdInAndLocalDateBetween(
            @Param("motoboyIds") List<String> motoboyIds, @Param("start") LocalDate start,
            @Param("endExclusive") LocalDate endExclusive, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    @Query("SELECT e FROM Entrega e WHERE e.motoboyId = :motoboyId AND e.formaPagamento = 'DINHEIRO' AND e.status = 'PENDENTE' AND e.localDate >= :start AND e.localDate < :endExclusive")
    List<Entrega> findPendentesByMotoboyIdAndLocalDateBetween(
            @Param("motoboyId") String motoboyId, @Param("start") LocalDate start, @Param("endExclusive") LocalDate endExclusive);

    @Query("SELECT e FROM Entrega e WHERE e.motoboyId IN :motoboyIds AND e.formaPagamento = 'DINHEIRO' AND e.status = 'PENDENTE' AND e.localDate >= :start AND e.localDate < :endExclusive")
    List<Entrega> findPendentesByMotoboyIdInAndLocalDateBetween(
            @Param("motoboyIds") List<String> motoboyIds, @Param("start") LocalDate start, @Param("endExclusive") LocalDate endExclusive);

    // Cross-tenant (sem filtro de motoboyId) — uso MASTER-only, pras séries
    // agregadas do Painel Master (volume da plataforma inteira, ranking de
    // empresas). Nenhuma outra query deste repositório varre todos os
    // tenants de uma vez.
    List<Entrega> findByLocalDateGreaterThanEqualAndLocalDateLessThan(LocalDate start, LocalDate endExclusive);

    // Fluxo logístico filtrado por UM status específico (uma aba = um
    // status, inclusive ENTREGUE) — diferente da versão antiga (removida),
    // que trazia um conjunto fixo de 3 status "não concluídos". O valor do
    // enum é passado como parâmetro (não hardcoded), então cada aba da tela
    // "Entregas Pendentes" (agora dentro de "Entregas") chama a mesma query
    // trocando só o status.
    Page<Entrega> findByMotoboyIdAndStatusLogisticoAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            String motoboyId, StatusLogisticoEntrega status, LocalDate start, LocalDate endExclusive, Pageable pageable);

    Page<Entrega> findByMotoboyIdInAndStatusLogisticoAndLocalDateGreaterThanEqualAndLocalDateLessThan(
            List<String> motoboyIds, StatusLogisticoEntrega status, LocalDate start, LocalDate endExclusive, Pageable pageable);
}
