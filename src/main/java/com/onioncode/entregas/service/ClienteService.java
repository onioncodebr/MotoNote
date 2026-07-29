package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Cliente;
import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.ClienteRankingResponseDTO;
import com.onioncode.entregas.dto.ClienteRequestDTO;
import com.onioncode.entregas.dto.ClienteResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.exception.ClienteNotFoundException;
import com.onioncode.entregas.exception.IntervaloDataInvalidoException;
import com.onioncode.entregas.repository.ClienteRepo;
import com.onioncode.entregas.repository.EntregaRepo;
import com.onioncode.entregas.repository.MotoboyRepo;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Cliente final da conta (quem recebe as entregas) — cadastro opcional,
// ligado por Usuario.permitirCadastroClientes. Sem checagem de nome
// duplicado (nomes de clientes finais podem legitimamente se repetir) e
// sem exigência de senha na exclusão (diferente de Motoboy, que tem
// login/credenciais associadas) — decisões registradas em
// fluxo-entrega-configuracoes.md.
@Service
public class ClienteService {

    private static final long MAX_DIAS_INTERVALO = 366;

    private final ClienteRepo clienteRepo;
    private final MotoboyRepo motoboyRepo;
    private final EntregaRepo entregaRepo;

    public ClienteService(ClienteRepo clienteRepo, MotoboyRepo motoboyRepo, EntregaRepo entregaRepo) {
        this.clienteRepo = clienteRepo;
        this.motoboyRepo = motoboyRepo;
        this.entregaRepo = entregaRepo;
    }

    public ClienteResponseDTO save(ClienteRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        Cliente cliente = new Cliente();
        cliente.setNome(dto.getNome());
        cliente.setTelefone(dto.getTelefone());
        cliente.setRua(dto.getRua());
        cliente.setNumero(dto.getNumero());
        cliente.setBairro(dto.getBairro());
        cliente.setCidade(dto.getCidade());
        cliente.setComplemento(dto.getComplemento());
        cliente.setUsuarioId(user.getId());
        cliente.setCriadoEm(Instant.now());

        clienteRepo.save(cliente);
        return clienteToResponse(cliente);
    }

    public ClienteResponseDTO update(String clienteId, ClienteRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        Cliente cliente = clienteRepo.findByIdAndUsuarioId(clienteId, user.getId())
                .orElseThrow(ClienteNotFoundException::new);

        cliente.setNome(dto.getNome());
        cliente.setTelefone(dto.getTelefone());
        cliente.setRua(dto.getRua());
        cliente.setNumero(dto.getNumero());
        cliente.setBairro(dto.getBairro());
        cliente.setCidade(dto.getCidade());
        cliente.setComplemento(dto.getComplemento());
        clienteRepo.save(cliente);
        return clienteToResponse(cliente);
    }

    // Exclusão não é bloqueada por ter entregas vinculadas — Entrega.clienteId
    // fica órfão, mesmo precedente já aceito no projeto pra motoboyId
    // (entregas sem motoboy correspondente são deixadas como estão).
    public void delete(String clienteId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        Cliente cliente = clienteRepo.findByIdAndUsuarioId(clienteId, user.getId())
                .orElseThrow(ClienteNotFoundException::new);
        clienteRepo.deleteById(cliente.getId());
    }

    public ClienteResponseDTO findById(String clienteId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        Cliente cliente = clienteRepo.findByIdAndUsuarioId(clienteId, user.getId())
                .orElseThrow(ClienteNotFoundException::new);
        return clienteToResponse(cliente);
    }

    // Lista completa do tenant — pro autocomplete/resolução de nome no
    // frontend (mesmo papel de getMotoboys()/motoboyNameById).
    public List<ClienteResponseDTO> findAll(Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        return clienteRepo.findByUsuarioId(user.getId()).stream().map(this::clienteToResponse).toList();
    }

    // Busca leve por nome OU telefone, resultados limitados — autocomplete
    // no formulário de Entrega.
    private static final int LIMITE_BUSCA = 10;

    public List<ClienteResponseDTO> buscar(String termo, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        List<Cliente> encontrados = buscarClientesDoTenant(termo, user.getId());
        return encontrados.stream()
                .sorted(Comparator.comparing(Cliente::getNome, String.CASE_INSENSITIVE_ORDER))
                .limit(LIMITE_BUSCA)
                .map(this::clienteToResponse)
                .toList();
    }

    // Compartilhado entre buscar() e buscarRankingPaginado() — termo vazio
    // retorna todos do tenant; termo preenchido é escapado com Pattern.quote
    // antes de ir pro $regex, tratado como texto literal (não regex),
    // mesmo padrão de UsuarioService ao buscar usuários por nome/e-mail —
    // evita ReDoS com metacaracteres digitados pelo usuário.
    private List<Cliente> buscarClientesDoTenant(String termo, String usuarioId) {
        if (termo == null || termo.isBlank()) {
            return clienteRepo.findByUsuarioId(usuarioId);
        }
        return clienteRepo.findByNomeOuTelefoneContainingAndUsuarioId(java.util.regex.Pattern.quote(termo), usuarioId);
    }

    // Ranking/listagem paginada da tela de gestão — junta cada Cliente do
    // tenant com estatísticas calculadas em memória a partir das Entrega
    // vinculadas, replicando a técnica já usada em
    // MetricasMasterService.rankingEmpresas (join em memória, sem
    // aggregation do Mongo, aceito na escala atual: dezenas/centenas de
    // clientes por conta, não milhares).
    public PageResponseDTO<ClienteRankingResponseDTO> buscarRankingPaginado(
            Authentication authentication, int page, int size, String nome,
            LocalDate startDate, LocalDate endDate, String ordenar, String direcao, boolean somenteSemPedidos) {
        Usuario user = (Usuario) authentication.getPrincipal();

        List<Cliente> clientes = buscarClientesDoTenant(nome, user.getId());

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();

        // Estatísticas relativas ao período informado (quantidade, gasto,
        // ticket médio, última entrega) — só entram aqui se startDate/endDate
        // vierem informados; sem período, olha o histórico inteiro.
        List<Entrega> entregasNoPeriodo = motoboyIds.isEmpty()
                ? List.of()
                : buscarEntregasComCliente(motoboyIds, startDate, endDate);

        Map<String, List<Entrega>> entregasPorCliente = entregasNoPeriodo.stream()
                .collect(Collectors.groupingBy(Entrega::getClienteId));

        // "Sem nenhum pedido" é sobre o HISTÓRICO INTEIRO do cliente, não
        // sobre o período filtrado (confirmado): precisa de uma busca
        // separada, sem filtro de data, só pra decidir quem nunca pediu nada
        // — senão "sem pedidos" viraria "sem pedidos nesse período".
        java.util.Set<String> clienteIdsComAlgumPedidoHistorico = motoboyIds.isEmpty()
                ? java.util.Set.of()
                : entregaRepo.findByMotoboyIdIn(motoboyIds).stream()
                        .map(Entrega::getClienteId)
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toSet());

        List<ClienteRankingResponseDTO> ranking = clientes.stream()
                .map(cliente -> montarRanking(cliente, entregasPorCliente.get(cliente.getId())))
                .filter(r -> !somenteSemPedidos || !clienteIdsComAlgumPedidoHistorico.contains(r.getCliente().getId()))
                .sorted(comparadorRanking(ordenar, direcao))
                .toList();

        int tamanhoSeguro = Math.min(Math.max(size, 1), PaginacaoUtils.MAX_PAGE_SIZE);
        int paginaSegura = Math.max(page, 0);
        int inicio = Math.min(paginaSegura * tamanhoSeguro, ranking.size());
        int fim = Math.min(inicio + tamanhoSeguro, ranking.size());

        PageImpl<ClienteRankingResponseDTO> pagina = new PageImpl<>(
                ranking.subList(inicio, fim), PageRequest.of(paginaSegura, tamanhoSeguro), ranking.size());
        return PageResponseDTO.from(pagina);
    }

    private List<Entrega> buscarEntregasComCliente(List<String> motoboyIds, LocalDate startDate, LocalDate endDate) {
        List<Entrega> entregas;
        if (startDate != null && endDate != null) {
            validarIntervalo(startDate, endDate);
            entregas = entregaRepo.findByMotoboyIdInAndLocalDateBetweenUtc(
                    motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        } else {
            entregas = entregaRepo.findByMotoboyIdIn(motoboyIds);
        }
        return entregas.stream().filter(e -> e.getClienteId() != null).toList();
    }

    private ClienteRankingResponseDTO montarRanking(Cliente cliente, List<Entrega> entregasDoCliente) {
        if (entregasDoCliente == null || entregasDoCliente.isEmpty()) {
            return new ClienteRankingResponseDTO(clienteToResponse(cliente), 0L, 0.0, null, null);
        }
        long quantidade = entregasDoCliente.size();
        // Total gasto = soma do valor do PEDIDO (o que o cliente pagou de
        // fato), não da taxa de entrega — pedido explícito do usuário,
        // troca a interpretação original registrada em
        // fluxo-entrega-configuracoes.md. Null-safe: nem toda entrega tem
        // valorPedido preenchido (só quando Dinheiro, ou com o modo
        // "sempre" ligado).
        double totalGasto = entregasDoCliente.stream()
                .mapToDouble(e -> e.getValorPedido() != null ? e.getValorPedido() : 0.0)
                .sum();
        Double ticketMedio = quantidade > 0 ? totalGasto / quantidade : null;
        LocalDate ultimaEntrega = entregasDoCliente.stream()
                .map(Entrega::getLocalDate)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        return new ClienteRankingResponseDTO(clienteToResponse(cliente), quantidade, totalGasto, ticketMedio, ultimaEntrega);
    }

    private Comparator<ClienteRankingResponseDTO> comparadorRanking(String ordenar, String direcao) {
        Comparator<ClienteRankingResponseDTO> comparador = switch (ordenar == null ? "" : ordenar) {
            case "pedidos" -> Comparator.comparingLong(ClienteRankingResponseDTO::getQuantidadePedidos);
            case "gasto" -> Comparator.comparingDouble(ClienteRankingResponseDTO::getTotalGasto);
            case "ticketMedio" -> Comparator.comparing(
                    r -> r.getTicketMedio() != null ? r.getTicketMedio() : -1.0);
            case "ultimaEntrega" -> Comparator.comparing(
                    ClienteRankingResponseDTO::getUltimaEntregaEm, Comparator.nullsFirst(Comparator.naturalOrder()));
            default -> Comparator.comparing(r -> r.getCliente().getNome(), String.CASE_INSENSITIVE_ORDER);
        };
        return "desc".equalsIgnoreCase(direcao) ? comparador.reversed() : comparador;
    }

    private Date startOfDayUtc(LocalDate date) {
        return Date.from(date.atStartOfDay(ZoneOffset.UTC).toInstant());
    }

    private void validarIntervalo(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IntervaloDataInvalidoException();
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > MAX_DIAS_INTERVALO) {
            throw new IntervaloDataInvalidoException(
                    "O período do relatório não pode ser maior que " + MAX_DIAS_INTERVALO + " dias.");
        }
    }

    private ClienteResponseDTO clienteToResponse(Cliente cliente) {
        return new ClienteResponseDTO(cliente.getId(), cliente.getNome(), cliente.getTelefone(),
                cliente.getRua(), cliente.getNumero(), cliente.getBairro(), cliente.getCidade(),
                cliente.getComplemento(), cliente.getCriadoEm());
    }
}
