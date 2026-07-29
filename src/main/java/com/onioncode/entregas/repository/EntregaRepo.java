package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.StatusLogisticoEntrega;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface EntregaRepo extends MongoRepository<Entrega, String> {
    List<Entrega> findByMotoboyId(String motoboyId);

    List<Entrega> findByMotoboyIdIn(List<String> motoboyIds);

    // Variantes paginadas das mesmas queries acima, usadas pela aba
    // "Entregas" (lista simples, sem filtro de data) pra não trazer o
    // histórico inteiro de uma vez em contas com alto volume.
    Page<Entrega> findByMotoboyId(String motoboyId, Pageable pageable);

    Page<Entrega> findByMotoboyIdIn(List<String> motoboyIds, Pageable pageable);

    // Busca entregas de um motoboy em uma data específica.
    // Recebe os limites (início do dia, início do dia seguinte) já convertidos para UTC
    // pelo EntregaService, em vez de deixar o Spring Data converter um LocalDate
    // implicitamente: essa conversão automática usa o fuso horário padrão da JVM
    // e ignora os conversores customizados registrados em MongoConfig, fazendo
    // consultas de "hoje"/"ontem" não baterem com dados gravados em UTC.
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findByMotoboyIdAndLocalDateUtc(String motoboyId, Date dayStartUtc, Date nextDayStartUtc);

    // Busca entregas de uma lista de motoboys em uma data específica
    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findByMotoboyIdInAndLocalDateUtc(List<String> motoboyIds, Date dayStartUtc, Date nextDayStartUtc);

    // Busca entregas de UM motoboy em um período (semana, mês, ano)
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc);

    // Busca entregas de TODOS os motoboys do usuário em um período
    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc);

    // Variantes paginadas das duas queries acima, usadas pela tabela dos
    // Relatórios na tela (o export continua usando as versões sem
    // paginação, que trazem o período inteiro de uma vez).
    @Query("{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Entrega> findByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    @Query("{ 'motoboyId': { $in: ?0 }, 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Entrega> findByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    // Pendências de recebimento em dinheiro — entregas antigas (gravadas antes
    // de formaPagamento/status existirem) não têm esses campos, então nunca
    // batem com esse filtro e ficam de fora automaticamente.
    // Versões paginadas, usadas pela tabela da aba "Valores Pendentes".
    @Query("{ 'motoboyId': ?0, 'formaPagamento': 'DINHEIRO', 'status': 'PENDENTE', 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Entrega> findPendentesByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    @Query("{ 'motoboyId': { $in: ?0 }, 'formaPagamento': 'DINHEIRO', 'status': 'PENDENTE', 'localDate': { $gte: ?1, $lt: ?2 } }")
    Page<Entrega> findPendentesByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    // Versões sem paginação, usadas só pro resumo (soma total do período).
    @Query("{ 'motoboyId': ?0, 'formaPagamento': 'DINHEIRO', 'status': 'PENDENTE', 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findPendentesByMotoboyIdAndLocalDateBetweenUtc(String motoboyId, Date startUtc, Date endExclusiveUtc);

    @Query("{ 'motoboyId': { $in: ?0 }, 'formaPagamento': 'DINHEIRO', 'status': 'PENDENTE', 'localDate': { $gte: ?1, $lt: ?2 } }")
    List<Entrega> findPendentesByMotoboyIdInAndLocalDateBetweenUtc(List<String> motoboyIds, Date startUtc, Date endExclusiveUtc);

    // Cross-tenant (sem filtro de motoboyId) — uso MASTER-only, pras séries
    // agregadas do Painel Master (volume da plataforma inteira, ranking de
    // empresas). Nenhuma outra query deste repositório varre todos os
    // tenants de uma vez.
    @Query("{ 'localDate': { $gte: ?0, $lt: ?1 } }")
    List<Entrega> findByLocalDateBetweenUtc(Date startUtc, Date endExclusiveUtc);

    // Fluxo logístico filtrado por UM status específico (uma aba = um
    // status, inclusive ENTREGUE) — diferente da versão antiga (removida),
    // que trazia um conjunto fixo de 3 status "não concluídos". O valor do
    // enum é passado como parâmetro (não hardcoded), então cada aba da tela
    // "Entregas Pendentes" (agora dentro de "Entregas") chama a mesma query
    // trocando só o status.
    @Query("{ 'motoboyId': ?0, 'statusLogistico': ?1, 'localDate': { $gte: ?2, $lt: ?3 } }")
    Page<Entrega> findByMotoboyIdAndStatusLogisticoAndLocalDateBetweenUtc(
            String motoboyId, StatusLogisticoEntrega status, Date startUtc, Date endExclusiveUtc, Pageable pageable);

    @Query("{ 'motoboyId': { $in: ?0 }, 'statusLogistico': ?1, 'localDate': { $gte: ?2, $lt: ?3 } }")
    Page<Entrega> findByMotoboyIdInAndStatusLogisticoAndLocalDateBetweenUtc(
            List<String> motoboyIds, StatusLogisticoEntrega status, Date startUtc, Date endExclusiveUtc, Pageable pageable);
}
