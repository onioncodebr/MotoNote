package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.AuditLog;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.TipoAcaoAuditoria;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AuditLogResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.repository.AuditLogRepo;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    private final AuditLogRepo auditLogRepo;
    private final MongoTemplate mongoTemplate;

    public AuditoriaService(AuditLogRepo auditLogRepo, MongoTemplate mongoTemplate) {
        this.auditLogRepo = auditLogRepo;
        this.mongoTemplate = mongoTemplate;
    }

    // Chamado a partir de UsuarioService/AssinaturaService logo após a ação
    // administrativa já ter sido persistida. Nunca propaga exceção: uma
    // falha ao gravar o log de auditoria (ex.: instabilidade do Mongo) não
    // pode derrubar o bloqueio/exclusão/edição em si, que já aconteceu.
    public void registrar(Authentication authentication, TipoAcaoAuditoria acao,
                           String alvoTipo, String alvoId, String alvoDescricao,
                           Map<String, Object> detalhes) {
        try {
            Usuario ator = (Usuario) authentication.getPrincipal();

            AuditLog registro = new AuditLog();
            registro.setActorId(ator.getId());
            registro.setActorNome(ator.getName());
            registro.setActorEmail(ator.getEmail());
            registro.setAcao(acao);
            registro.setAlvoTipo(alvoTipo);
            registro.setAlvoId(alvoId);
            registro.setAlvoDescricao(alvoDescricao);
            registro.setDetalhes(detalhes);
            registro.setCriadoEm(Instant.now());

            auditLogRepo.save(registro);
        } catch (Exception ex) {
            log.error("Falha ao registrar log de auditoria (ação={}, alvoId={})", acao, alvoId, ex);
        }
    }

    // Sem nenhum filtro informado, cai no findAll(Pageable) simples (mais
    // barato que montar uma Query vazia). Com pelo menos um filtro, usa
    // MongoTemplate — combinar até 4 critérios opcionais (ação/ator/período)
    // via métodos derivados do Spring Data viraria uma explosão de
    // combinações; MongoTemplate deixa montar só os critérios presentes.
    public PageResponseDTO<AuditLogResponseDTO> findAllPaged(Authentication authentication, int page, int size,
                                                              TipoAcaoAuditoria acao, String ator,
                                                              LocalDate desde, LocalDate ate) {
        exigirMaster(authentication);
        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "criadoEm"));

        boolean semFiltro = acao == null && (ator == null || ator.isBlank()) && desde == null && ate == null;
        if (semFiltro) {
            Page<AuditLog> resultado = auditLogRepo.findAll(pageable);
            return PageResponseDTO.from(resultado.map(this::toDTO));
        }

        List<Criteria> criterios = new ArrayList<>();
        if (acao != null) {
            criterios.add(Criteria.where("acao").is(acao));
        }
        if (ator != null && !ator.isBlank()) {
            criterios.add(new Criteria().orOperator(
                    Criteria.where("actorNome").regex(ator, "i"),
                    Criteria.where("actorEmail").regex(ator, "i")));
        }
        if (desde != null) {
            criterios.add(Criteria.where("criadoEm").gte(inicioDoDiaUtc(desde)));
        }
        if (ate != null) {
            // Limite exclusivo (início do dia seguinte) em vez de "<=
            // 23:59:59" — mesma técnica já usada em EntregaRepo pros
            // filtros de período por data.
            criterios.add(Criteria.where("criadoEm").lt(inicioDoDiaUtc(ate.plusDays(1))));
        }

        Criteria criteriaFinal = new Criteria().andOperator(criterios.toArray(new Criteria[0]));
        Query query = new Query(criteriaFinal);

        long total = mongoTemplate.count(query, AuditLog.class);
        query.with(pageable);
        List<AuditLog> conteudo = mongoTemplate.find(query, AuditLog.class);

        Page<AuditLog> resultado = new PageImpl<>(conteudo, pageable, total);
        return PageResponseDTO.from(resultado.map(this::toDTO));
    }

    private Instant inicioDoDiaUtc(LocalDate data) {
        return data.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private AuditLogResponseDTO toDTO(AuditLog registro) {
        return new AuditLogResponseDTO(
                registro.getId(), registro.getActorNome(), registro.getActorEmail(), registro.getAcao(),
                registro.getAlvoTipo(), registro.getAlvoId(), registro.getAlvoDescricao(),
                registro.getDetalhes(), registro.getCriadoEm());
    }

    private void exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
    }
}
