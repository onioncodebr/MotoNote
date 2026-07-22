package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.EntregaRequestDTO;
import com.onioncode.entregas.dto.EntregaResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoFaturamentoDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.exception.EntregaNotFoundException;
import com.onioncode.entregas.exception.IntervaloDataInvalidoException;
import com.onioncode.entregas.exception.MotoboyNotFoundException;
import com.onioncode.entregas.repository.EntregaRepo;
import com.onioncode.entregas.repository.MotoboyRepo;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class EntregaService {

    // Teto pro intervalo de datas dos relatórios (inclui os endpoints sem
    // paginação, usados pra export) — sem isso um período de vários anos
    // trazia o dataset inteiro de uma vez pro servidor/cliente.
    private static final long MAX_DIAS_INTERVALO = 366;

    private final EntregaRepo entregaRepo;
    private final MotoboyRepo motoboyRepo;

    public EntregaService(EntregaRepo entregaRepo, MotoboyRepo motoboyRepo) {
        this.entregaRepo = entregaRepo;
        this.motoboyRepo = motoboyRepo;
    }

    public EntregaResponseDTO save(EntregaRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // Validação: Garante que o motoboy existe e pertence ao usuário logado
        Motoboy motoboy = motoboyRepo.findByIdAndUsuarioId(dto.getMotoboyId(), user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        // Converte e salva
        Entrega entrega = requestToEntrega(dto);
        entregaRepo.save(entrega);

        return entregaToResponse(entrega);
    }

    // --- Métodos Utilitários ---

    private Entrega requestToEntrega(EntregaRequestDTO dto) {
        Entrega entrega = new Entrega();
        entrega.setValue(dto.getValue());
        entrega.setMotoboyId(dto.getMotoboyId());
        // Usa a data informada pelo usuário; se não vier, assume a data atual.
        entrega.setLocalDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        return entrega;
    }

    // Converte um LocalDate para o início do dia em UTC, no mesmo formato em que
    // o campo Entrega.localDate é gravado no banco (ver MongoConfig). Usado para
    // montar manualmente os limites das consultas por data, já que o Spring Data
    // não aplica esse conversor customizado ao converter parâmetros de query.
    private Date startOfDayUtc(LocalDate date) {
        return Date.from(date.atStartOfDay(ZoneOffset.UTC).toInstant());
    }

    private EntregaResponseDTO entregaToResponse(Entrega entrega) {
        return new EntregaResponseDTO(
                entrega.getId(),
                entrega.getValue(),
                entrega.getLocalDate(),
                entrega.getMotoboyId()
        );
    }

    // Método para atualizar o valor da entrega
    public EntregaResponseDTO updateValue(String entregaId, Double newValue, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // 1. Busca a entrega pelo ID
        Entrega entrega = entregaRepo.findById(entregaId)
                .orElseThrow(EntregaNotFoundException::new);

        // 2. Segurança: Verifica se o motoboy dessa entrega pertence ao usuário logado
        motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        // 3. Atualiza apenas o valor
        entrega.setValue(newValue);
        entregaRepo.save(entrega);

        return entregaToResponse(entrega);
    }

    // Método para excluir a entrega
    public void delete(String entregaId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // 1. Busca a entrega para checar se ela existe e pegar o motoboyId
        Entrega entrega = entregaRepo.findById(entregaId)
                .orElseThrow(EntregaNotFoundException::new);

        // 2. Segurança: Verifica se o motoboy dessa entrega pertence ao usuário logado
        motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        // 3. Exclui a entrega
        entregaRepo.deleteById(entregaId);
    }

    public List<EntregaResponseDTO> findAllByMotoboy(String motoboyId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // 1. Garante que o motoboy pertence ao usuário logado
        motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        // 2. Busca as entregas
        List<Entrega> entregas = entregaRepo.findByMotoboyId(motoboyId);

        // 3. Converte para DTO
        return entregas.stream().map(this::entregaToResponse).toList();
    }

    // --- Portal do motoboy (self-service, só leitura) ---
    // O id vem sempre do principal Motoboy autenticado (nunca de um
    // parâmetro do request), então não precisa checar dono: o próprio id já
    // É a garantia de que só entregas dele voltam.

    public PageResponseDTO<EntregaResponseDTO> findAllByMotoboySelfPaged(String motoboyId, int page, int size) {
        Page<Entrega> resultado = entregaRepo.findByMotoboyId(motoboyId, pageableDescPorData(page, size));
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    public List<EntregaResponseDTO> findByMotoboyAndDateRangeSelf(String motoboyId, LocalDate startDate, LocalDate endDate) {
        validarIntervalo(startDate, endDate);
        List<Entrega> entregas = entregaRepo.findByMotoboyIdAndLocalDateBetweenUtc(motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        return entregas.stream().map(this::entregaToResponse).toList();
    }

    // Versão paginada da mesma consulta, usada pela tabela do relatório na
    // tela (o export continua usando a versão de cima, sem paginação, pra
    // trazer o período inteiro de uma vez).
    public PageResponseDTO<EntregaResponseDTO> findByMotoboyAndDateRangeSelfPaged(String motoboyId, LocalDate startDate, LocalDate endDate, int page, int size) {
        validarIntervalo(startDate, endDate);
        Page<Entrega> resultado = entregaRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageableDescPorData(page, size));
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    public ResumoFaturamentoDTO getResumoFaturamentoMotoboySelf(String motoboyId, LocalDate startDate, LocalDate endDate) {
        List<EntregaResponseDTO> entregas = findByMotoboyAndDateRangeSelf(motoboyId, startDate, endDate);
        Integer quantidade = entregas.size();
        Double total = entregas.stream().mapToDouble(EntregaResponseDTO::getValue).sum();
        return new ResumoFaturamentoDTO(quantidade, total);
    }

    public EntregaResponseDTO findById(String entregaId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        Entrega entrega = entregaRepo.findById(entregaId)
                .orElseThrow(EntregaNotFoundException::new);

        // Validação de segurança
        motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        return entregaToResponse(entrega);
    }

    public PageResponseDTO<EntregaResponseDTO> findAllByUserPaged(Authentication authentication, int page, int size) {
        Usuario user = (Usuario) authentication.getPrincipal();

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();

        Pageable pageable = pageableDescPorData(page, size);
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }

        Page<Entrega> resultado = entregaRepo.findByMotoboyIdIn(motoboyIds, pageable);
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    // Página sempre ordenada pela entrega mais recente primeiro.
    private Pageable pageableDescPorData(int page, int size) {
        return PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "localDate"));
    }

    // 1. Fechamento do dia de UM motoboy específico
    public List<EntregaResponseDTO> findByMotoboyAndDate(String motoboyId, LocalDate date, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // Segurança: Garante que o motoboy é do usuário logado
        motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        // Busca no banco pela data
        List<Entrega> entregas = entregaRepo.findByMotoboyIdAndLocalDateUtc(motoboyId, startOfDayUtc(date), startOfDayUtc(date.plusDays(1)));

        return entregas.stream().map(this::entregaToResponse).toList();
    }

    // 2. Faturamento geral da empresa em um dia específico (Todos os motoboys)
    public List<EntregaResponseDTO> findAllByUserAndDate(LocalDate date, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // Pega todos os motoboys do usuário e extrai apenas os IDs
        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId())
                .stream()
                .map(Motoboy::getId)
                .toList();

        // Se o usuário não tiver nenhum motoboy, retorna lista vazia para evitar erro na query
        if (motoboyIds.isEmpty()) {
            return new ArrayList<>();
        }

        // Busca todas as entregas desses motoboys na data informada
        List<Entrega> entregas = entregaRepo.findByMotoboyIdInAndLocalDateUtc(motoboyIds, startOfDayUtc(date), startOfDayUtc(date.plusDays(1)));

        return entregas.stream().map(this::entregaToResponse).toList();
    }


    // Relatório de UM motoboy por período
    public List<EntregaResponseDTO> findByMotoboyAndDateRange(String motoboyId, LocalDate startDate, LocalDate endDate, Authentication auth) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();

        motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        List<Entrega> entregas = entregaRepo.findByMotoboyIdAndLocalDateBetweenUtc(motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        return entregas.stream().map(this::entregaToResponse).toList();
    }

    // Relatório GERAL da empresa por período
    public List<EntregaResponseDTO> findAllByUserAndDateRange(LocalDate startDate, LocalDate endDate, Authentication auth) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId())
                .stream()
                .map(Motoboy::getId)
                .toList();

        if (motoboyIds.isEmpty()) return new ArrayList<>();

        List<Entrega> entregas = entregaRepo.findByMotoboyIdInAndLocalDateBetweenUtc(motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        return entregas.stream().map(this::entregaToResponse).toList();
    }

    // Versão paginada do relatório (geral ou de um motoboy específico,
    // conforme motoboyId venha preenchido ou não), usada pela tabela na
    // tela — o export continua batendo nos métodos de cima (sem
    // paginação), que trazem o período inteiro de uma vez.
    public PageResponseDTO<EntregaResponseDTO> findReportPaged(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth, int page, int size) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();
        Pageable pageable = pageableDescPorData(page, size);

        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            Page<Entrega> resultado = entregaRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
            return PageResponseDTO.from(resultado.map(this::entregaToResponse));
        }

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }
        Page<Entrega> resultado = entregaRepo.findByMotoboyIdInAndLocalDateBetweenUtc(
                motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    // Antes disso, um intervalo invertido (startDate depois de endDate) não
    // dava erro nenhum — só retornava lista vazia silenciosamente, deixando
    // o usuário sem nenhuma pista do porquê "não achou nada".
    private void validarIntervalo(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IntervaloDataInvalidoException();
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > MAX_DIAS_INTERVALO) {
            throw new IntervaloDataInvalidoException(
                    "O período do relatório não pode ser maior que " + MAX_DIAS_INTERVALO + " dias.");
        }
    }

    // Retorna o resumo total (quantidade e soma dos valores) da empresa em um período
    public ResumoFaturamentoDTO getResumoFaturamento(LocalDate startDate, LocalDate endDate, Authentication auth) {
        return getResumoFaturamento(startDate, endDate, null, auth);
    }

    // Variante com filtro opcional de motoboy — usada pelos Relatórios
    // quando o dono filtra por um motoboy específico (o resumo geral não
    // aceitava esse filtro antes; sem ele, os totais mostrados na tela não
    // batiam com a tabela filtrada).
    public ResumoFaturamentoDTO getResumoFaturamento(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth) {
        List<EntregaResponseDTO> entregas = (motoboyId != null && !motoboyId.isBlank())
                ? findByMotoboyAndDateRange(motoboyId, startDate, endDate, auth)
                : findAllByUserAndDateRange(startDate, endDate, auth);

        Integer quantidade = entregas.size();
        Double total = entregas.stream()
                .mapToDouble(EntregaResponseDTO::getValue)
                .sum();

        return new ResumoFaturamentoDTO(quantidade, total);
    }
}