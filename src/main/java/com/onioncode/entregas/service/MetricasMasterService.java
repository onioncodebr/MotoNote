package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.MetricasMasterResponseDTO;
import com.onioncode.entregas.dto.PlanoResponseDTO;
import com.onioncode.entregas.dto.PontoSerieDTO;
import com.onioncode.entregas.dto.RankingEmpresaResponseDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.repository.AssinaturaRepo;
import com.onioncode.entregas.repository.EntregaRepo;
import com.onioncode.entregas.repository.MotoboyRepo;
import com.onioncode.entregas.repository.UsuarioRepo;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MetricasMasterService {

    // Usado por calcularTaxaConversaoTrial: de quem já saiu de
    // SEM_ASSINATURA, qual fração está pagando (ATIVA) agora.
    private static final Set<StatusAssinatura> STATUS_ENGAJADOS = Set.of(
            StatusAssinatura.TRIALING, StatusAssinatura.ATIVA, StatusAssinatura.CANCELADA, StatusAssinatura.INADIMPLENTE);

    private final UsuarioRepo usuarioRepo;
    private final MotoboyRepo motoboyRepo;
    private final EntregaRepo entregaRepo;
    private final AssinaturaRepo assinaturaRepo;
    private final AssinaturaService assinaturaService;

    public MetricasMasterService(UsuarioRepo usuarioRepo, MotoboyRepo motoboyRepo, EntregaRepo entregaRepo,
                                  AssinaturaRepo assinaturaRepo, AssinaturaService assinaturaService) {
        this.usuarioRepo = usuarioRepo;
        this.motoboyRepo = motoboyRepo;
        this.entregaRepo = entregaRepo;
        this.assinaturaRepo = assinaturaRepo;
        this.assinaturaService = assinaturaService;
    }

    public MetricasMasterResponseDTO calcular(Authentication authentication) {
        exigirMaster(authentication);

        long totalUsuarios = usuarioRepo.countByRoleNot(Role.MASTER);
        long totalMotoboys = motoboyRepo.count();
        long totalEntregas = entregaRepo.count();

        Map<StatusAssinatura, Long> usuariosPorStatus = new EnumMap<>(StatusAssinatura.class);
        long comDocumento = 0;
        for (StatusAssinatura status : StatusAssinatura.values()) {
            if (status == StatusAssinatura.SEM_ASSINATURA) continue;
            long quantidade = assinaturaRepo.countByStatus(status);
            usuariosPorStatus.put(status, quantidade);
            comDocumento += quantidade;
        }
        // Contas criadas manualmente pelo MASTER nunca ganham um placeholder
        // de Assinatura (ver UsuarioService.resolverUsuarioIdsPorStatus) —
        // então "sem assinatura" também inclui quem não tem documento nenhum.
        long semDocumentoAlgum = Math.max(0, totalUsuarios - comDocumento);
        usuariosPorStatus.put(StatusAssinatura.SEM_ASSINATURA,
                assinaturaRepo.countByStatus(StatusAssinatura.SEM_ASSINATURA) + semDocumentoAlgum);

        PlanoResponseDTO plano = assinaturaService.buscarPlano();
        double mrr = usuariosPorStatus.getOrDefault(StatusAssinatura.ATIVA, 0L) * plano.getValorMensal();

        long usuariosAtivosAgora = usuarioRepo.countByUltimoAcessoEmAfter(Instant.now().minus(15, ChronoUnit.MINUTES));
        double taxaConversaoTrial = calcularTaxaConversaoTrial(usuariosPorStatus);

        return new MetricasMasterResponseDTO(totalUsuarios, totalMotoboys, totalEntregas, mrr, plano.getMoeda(),
                usuariosPorStatus, usuariosAtivosAgora, taxaConversaoTrial);
    }

    // Aproximação por snapshot atual, não um funil por coorte de tempo (ver
    // comentário no DTO).
    private double calcularTaxaConversaoTrial(Map<StatusAssinatura, Long> usuariosPorStatus) {
        long engajados = STATUS_ENGAJADOS.stream().mapToLong(s -> usuariosPorStatus.getOrDefault(s, 0L)).sum();
        if (engajados == 0) return 0;
        long ativos = usuariosPorStatus.getOrDefault(StatusAssinatura.ATIVA, 0L);
        return (ativos * 100.0) / engajados;
    }

    // --- Séries temporais (gráficos do Painel Master) ---

    public List<PontoSerieDTO> cadastrosPorDia(Authentication authentication, int dias) {
        exigirMaster(authentication);
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);
        LocalDate inicio = hoje.minusDays(Math.max(dias, 1) - 1L);

        List<Usuario> usuarios = usuarioRepo.findByRoleNotAndCreatedAtBetween(
                Role.MASTER, inicioDoDiaUtc(inicio), inicioDoDiaUtc(hoje.plusDays(1)));

        Map<LocalDate, Long> contagemPorDia = usuarios.stream()
                .collect(Collectors.groupingBy(u -> u.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(), Collectors.counting()));

        return preencherSerie(inicio, hoje, contagemPorDia);
    }

    public List<PontoSerieDTO> entregasPorDia(Authentication authentication, int dias) {
        exigirMaster(authentication);
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);
        LocalDate inicio = hoje.minusDays(Math.max(dias, 1) - 1L);

        List<Entrega> entregas = buscarEntregasNoPeriodo(inicio, hoje);

        Map<LocalDate, Long> contagemPorDia = entregas.stream()
                .collect(Collectors.groupingBy(Entrega::getLocalDate, Collectors.counting()));

        return preencherSerie(inicio, hoje, contagemPorDia);
    }

    private List<Entrega> buscarEntregasNoPeriodo(LocalDate inicio, LocalDate fimInclusive) {
        Date startUtc = Date.from(inicioDoDiaUtc(inicio));
        Date endExclusiveUtc = Date.from(inicioDoDiaUtc(fimInclusive.plusDays(1)));
        return entregaRepo.findByLocalDateBetweenUtc(startUtc, endExclusiveUtc);
    }

    // --- Ranking de empresas (painel Master) ---

    // "Join" em memória (Entrega -> Motoboy -> Usuario), sem $lookup do
    // Mongo — mesmo padrão já usado no resto deste service, aceitável na
    // escala atual (dezenas/centenas de tenants).
    public List<RankingEmpresaResponseDTO> rankingEmpresas(Authentication authentication, int dias, int limite) {
        exigirMaster(authentication);
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);
        LocalDate inicio = hoje.minusDays(Math.max(dias, 1) - 1L);

        List<Entrega> entregas = buscarEntregasNoPeriodo(inicio, hoje);
        if (entregas.isEmpty()) {
            return List.of();
        }

        Map<String, String> usuarioIdPorMotoboyId = motoboyRepo.findAll().stream()
                .collect(Collectors.toMap(Motoboy::getId, Motoboy::getUsuarioId, (a, b) -> a));

        Map<String, Long> quantidadePorEmpresa = new HashMap<>();
        Map<String, Double> faturamentoPorEmpresa = new HashMap<>();
        for (Entrega entrega : entregas) {
            String usuarioId = usuarioIdPorMotoboyId.get(entrega.getMotoboyId());
            if (usuarioId == null) continue; // motoboy removido depois da entrega
            quantidadePorEmpresa.merge(usuarioId, 1L, Long::sum);
            faturamentoPorEmpresa.merge(usuarioId, entrega.getValue() != null ? entrega.getValue() : 0.0, Double::sum);
        }

        List<String> usuarioIdsRanking = faturamentoPorEmpresa.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(Math.max(limite, 1))
                .map(Map.Entry::getKey)
                .toList();

        Map<String, Usuario> usuariosPorId = usuarioRepo.findAllById(usuarioIdsRanking).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u));

        return usuarioIdsRanking.stream()
                .map(usuarioId -> {
                    Usuario usuario = usuariosPorId.get(usuarioId);
                    String nomeEmpresa = usuario != null ? usuario.getName() : "—";
                    String emailEmpresa = usuario != null ? usuario.getEmail() : "";
                    return new RankingEmpresaResponseDTO(nomeEmpresa, emailEmpresa,
                            quantidadePorEmpresa.getOrDefault(usuarioId, 0L),
                            faturamentoPorEmpresa.getOrDefault(usuarioId, 0.0));
                })
                .toList();
    }

    private Instant inicioDoDiaUtc(LocalDate data) {
        return data.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    // Preenche os dias sem nenhum evento com quantidade 0, pra a série sair
    // completa (sem buracos) do início ao fim do período.
    private List<PontoSerieDTO> preencherSerie(LocalDate inicio, LocalDate fimInclusive, Map<LocalDate, Long> contagemPorDia) {
        List<PontoSerieDTO> serie = new ArrayList<>();
        for (LocalDate data = inicio; !data.isAfter(fimInclusive); data = data.plusDays(1)) {
            serie.add(new PontoSerieDTO(data, contagemPorDia.getOrDefault(data, 0L)));
        }
        return serie;
    }

    private void exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
    }
}
