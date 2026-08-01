package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.AuditLog;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.AuditLogResponseDTO;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.exception.AcessoNegadoException;
import br.com.onioncode.motonote.repository.AuditLogRepo;
import br.com.onioncode.motonote.util.PaginacaoUtils;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

    public AuditoriaService(AuditLogRepo auditLogRepo) {
        this.auditLogRepo = auditLogRepo;
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
    // barato que montar uma Specification vazia). Com pelo menos um filtro,
    // usa JpaSpecificationExecutor — combinar até 4 critérios opcionais
    // (ação/ator/período) via métodos derivados do Spring Data viraria uma
    // explosão de combinações; Specification deixa montar só os predicados
    // presentes, equivalente ao antigo MongoTemplate/Criteria.
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

        Specification<AuditLog> specification = (root, query, cb) -> {
            List<Predicate> predicados = new ArrayList<>();
            if (acao != null) {
                predicados.add(cb.equal(root.get("acao"), acao));
            }
            if (ator != null && !ator.isBlank()) {
                String termo = "%" + ator + "%";
                predicados.add(cb.or(
                        cb.like(cb.upper(root.get("actorNome")), termo.toUpperCase()),
                        cb.like(cb.upper(root.get("actorEmail")), termo.toUpperCase())));
            }
            if (desde != null) {
                predicados.add(cb.greaterThanOrEqualTo(root.get("criadoEm"), inicioDoDiaUtc(desde)));
            }
            if (ate != null) {
                // Limite exclusivo (início do dia seguinte) em vez de "<=
                // 23:59:59" — mesma técnica já usada em EntregaRepo pros
                // filtros de período por data.
                predicados.add(cb.lessThan(root.get("criadoEm"), inicioDoDiaUtc(ate.plusDays(1))));
            }
            return cb.and(predicados.toArray(new Predicate[0]));
        };

        Page<AuditLog> resultado = auditLogRepo.findAll(specification, pageable);
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
