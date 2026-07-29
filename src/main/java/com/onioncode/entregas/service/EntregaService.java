package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.FormaPagamento;
import com.onioncode.entregas.domain.ModoValorPedidoObrigatorio;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.StatusLogisticoEntrega;
import com.onioncode.entregas.domain.StatusRecebimento;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.BaixaEmMassaResponseDTO;
import com.onioncode.entregas.dto.ContagemStatusLogisticoDTO;
import com.onioncode.entregas.dto.EntregaRequestDTO;
import com.onioncode.entregas.dto.EntregaResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoFaturamentoDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.exception.ClienteNotFoundException;
import com.onioncode.entregas.exception.DadosClienteObrigatoriosException;
import com.onioncode.entregas.exception.EntregaNaoPendenteException;
import com.onioncode.entregas.exception.EntregaNotFoundException;
import com.onioncode.entregas.exception.IntervaloDataInvalidoException;
import com.onioncode.entregas.exception.MotoboyNotFoundException;
import com.onioncode.entregas.exception.ObservacaoObrigatoriaException;
import com.onioncode.entregas.exception.ValorPedidoMenorQueEntregaException;
import com.onioncode.entregas.exception.ValorPedidoObrigatorioException;
import com.onioncode.entregas.repository.ClienteRepo;
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
import java.util.Map;

@Service
public class EntregaService {

    // Teto pro intervalo de datas dos relatórios (inclui os endpoints sem
    // paginação, usados pra export) — sem isso um período de vários anos
    // trazia o dataset inteiro de uma vez pro servidor/cliente.
    private static final long MAX_DIAS_INTERVALO = 366;

    private final EntregaRepo entregaRepo;
    private final MotoboyRepo motoboyRepo;
    private final ClienteRepo clienteRepo;

    public EntregaService(EntregaRepo entregaRepo, MotoboyRepo motoboyRepo, ClienteRepo clienteRepo) {
        this.entregaRepo = entregaRepo;
        this.motoboyRepo = motoboyRepo;
        this.clienteRepo = clienteRepo;
    }

    public EntregaResponseDTO save(EntregaRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        // Validação: Garante que o motoboy existe e pertence ao usuário logado
        Motoboy motoboy = motoboyRepo.findByIdAndUsuarioId(dto.getMotoboyId(), user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        // Valor do pedido é obrigatório em Dinheiro (o motoboy precisa saber
        // quanto trazer pro caixa) ou, se a conta configurou assim, em
        // qualquer forma de pagamento (Usuario.modoValorPedidoObrigatorio ou
        // mostrarFaturamentoPedidos — este último também libera o card de
        // Faturamento dos Pedidos na Visão Geral, que depende do valor do
        // pedido estar sempre preenchido pra a soma ser completa).
        boolean exigeValorPedido = dto.getFormaPagamento() == FormaPagamento.DINHEIRO
                || user.getModoValorPedidoObrigatorio() == ModoValorPedidoObrigatorio.TODAS_ENTREGAS
                || user.isMostrarFaturamentoPedidos();
        if (exigeValorPedido && dto.getValorPedido() == null) {
            throw new ValorPedidoObrigatorioException();
        }

        // Valor do pedido é o total que o motoboy recebe em mãos (produto +
        // taxa de entrega) — por definição, nunca pode ser menor ou igual só
        // à taxa de entrega.
        if (dto.getValorPedido() != null && dto.getValorPedido() <= dto.getValue()) {
            throw new ValorPedidoMenorQueEntregaException();
        }

        // Nome do cliente + descrição do pedido, obrigatórios só quando a
        // conta ligou essa config (texto livre — ver permitirCadastroClientes
        // pra cadastro completo de Cliente, campo independente).
        if (user.isPermitirDadosCliente() &&
                (dto.getNomeCliente() == null || dto.getNomeCliente().isBlank()
                        || dto.getDescricaoPedido() == null || dto.getDescricaoPedido().isBlank())) {
            throw new DadosClienteObrigatoriosException();
        }

        // Cliente vinculado é sempre opcional, mesmo com permitirCadastroClientes
        // ligado — mas quando informado, precisa pertencer ao tenant logado
        // (mesma validação já aplicada ao motoboyId acima).
        if (dto.getClienteId() != null && !dto.getClienteId().isBlank()) {
            clienteRepo.findByIdAndUsuarioId(dto.getClienteId(), user.getId())
                    .orElseThrow(ClienteNotFoundException::new);
        }

        // Converte e salva
        Entrega entrega = requestToEntrega(dto, user);
        entregaRepo.save(entrega);

        return entregaToResponse(entrega);
    }

    // --- Métodos Utilitários ---

    private Entrega requestToEntrega(EntregaRequestDTO dto, Usuario user) {
        Entrega entrega = new Entrega();
        entrega.setValue(dto.getValue());
        entrega.setMotoboyId(dto.getMotoboyId());
        // Usa a data informada pelo usuário; se não vier, assume a data atual.
        entrega.setLocalDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        entrega.setFormaPagamento(dto.getFormaPagamento());
        // Só Dinheiro fica pendente — o motoboy fica com o valor em mãos até
        // repassar pro dono. Pix/Cartão caem direto na conta da empresa.
        entrega.setStatus(dto.getFormaPagamento() == FormaPagamento.DINHEIRO
                ? StatusRecebimento.PENDENTE
                : StatusRecebimento.RECEBIDO);
        // Opcional em qualquer forma de pagamento (só obrigatório em
        // Dinheiro, checado acima em save()) — em Pix/Crédito/Débito serve
        // só de registro informativo, sem entrar no cálculo de pendências
        // (que já filtra por status = PENDENTE, exclusivo de Dinheiro).
        entrega.setValorPedido(dto.getValorPedido());
        entrega.setNomeCliente(dto.getNomeCliente());
        entrega.setDescricaoPedido(dto.getDescricaoPedido());
        entrega.setClienteId(dto.getClienteId());
        // Fluxo logístico nasce em NA_LOJA só se a conta tem o controle
        // habilitado — senão fica null (feature desligada pra essa conta).
        entrega.setStatusLogistico(user.isControleFluxoEntregaHabilitado() ? StatusLogisticoEntrega.NA_LOJA : null);
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
                entrega.getMotoboyId(),
                entrega.getFormaPagamento(),
                entrega.getStatus(),
                entrega.getValorPedido(),
                entrega.getNomeCliente(),
                entrega.getDescricaoPedido(),
                entrega.getClienteId(),
                entrega.getStatusLogistico(),
                entrega.getObservacaoNaoEntregue()
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

    // Confirma que o motoboy repassou um valor em dinheiro que estava pendente.
    public EntregaResponseDTO darBaixa(String entregaId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();

        Entrega entrega = entregaRepo.findById(entregaId)
                .orElseThrow(EntregaNotFoundException::new);

        motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        if (entrega.getFormaPagamento() != FormaPagamento.DINHEIRO || entrega.getStatus() != StatusRecebimento.PENDENTE) {
            throw new EntregaNaoPendenteException();
        }

        entrega.setStatus(StatusRecebimento.RECEBIDO);
        entregaRepo.save(entrega);

        return entregaToResponse(entrega);
    }

    // Mesma confirmação acima, mas para várias entregas de uma vez. Entregas
    // que não pertencem ao usuário logado interrompem a operação (violação de
    // segurança); entregas que já não estão pendentes são simplesmente
    // ignoradas, pra a ação em massa ser idempotente.
    public BaixaEmMassaResponseDTO darBaixaEmMassa(List<String> entregaIds, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        int quantidadeAtualizada = 0;

        for (String entregaId : entregaIds) {
            Entrega entrega = entregaRepo.findById(entregaId)
                    .orElseThrow(EntregaNotFoundException::new);

            motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                    .orElseThrow(AcessoNegadoException::new);

            if (entrega.getFormaPagamento() == FormaPagamento.DINHEIRO && entrega.getStatus() == StatusRecebimento.PENDENTE) {
                entrega.setStatus(StatusRecebimento.RECEBIDO);
                entregaRepo.save(entrega);
                quantidadeAtualizada++;
            }
        }

        return new BaixaEmMassaResponseDTO(quantidadeAtualizada);
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

    // Página de entregas pendentes de recebimento em dinheiro (geral, ou de um
    // motoboy específico se motoboyId vier preenchido) — usada pela aba
    // "Valores Pendentes".
    public PageResponseDTO<EntregaResponseDTO> findPendentes(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth, int page, int size) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();
        Pageable pageable = pageableDescPorData(page, size);

        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            Page<Entrega> resultado = entregaRepo.findPendentesByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
            return PageResponseDTO.from(resultado.map(this::entregaToResponse));
        }

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }
        Page<Entrega> resultado = entregaRepo.findPendentesByMotoboyIdInAndLocalDateBetweenUtc(
                motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    // Resumo (quantidade + soma) dos valores pendentes em dinheiro no
    // período — usado pelo card da Visão Geral e pelo topo da aba "Valores
    // Pendentes" (mesma ideia de getResumoFaturamento, mas sobre as versões
    // sem paginação das queries de pendentes).
    public ResumoFaturamentoDTO getResumoPendentes(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();

        List<Entrega> pendentes;
        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            pendentes = entregaRepo.findPendentesByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        } else {
            List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                    .map(Motoboy::getId)
                    .toList();
            pendentes = motoboyIds.isEmpty()
                    ? new ArrayList<>()
                    : entregaRepo.findPendentesByMotoboyIdInAndLocalDateBetweenUtc(
                            motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        }

        Integer quantidade = pendentes.size();
        // Soma o valor do pedido (o que precisa voltar ao caixa), não o
        // value (taxa da entrega) — null-safe porque entregas registradas
        // antes desse campo existir não o têm preenchido.
        Double total = pendentes.stream()
                .mapToDouble(e -> e.getValorPedido() != null ? e.getValorPedido() : 0.0)
                .sum();
        return new ResumoFaturamentoDTO(quantidade, total);
    }

    // --- Fluxo logístico da entrega (Na loja/Em rota/Não foi possível
    // entregar/Entregue) — opt-in via Usuario.controleFluxoEntregaHabilitado.
    // Ver fluxo-entrega-configuracoes.md. ---

    public EntregaResponseDTO atualizarStatusLogistico(String entregaId, StatusLogisticoEntrega novoStatus,
                                                         String observacao, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        if (!user.isControleFluxoEntregaHabilitado()) {
            throw new AcessoNegadoException();
        }

        Entrega entrega = entregaRepo.findById(entregaId)
                .orElseThrow(EntregaNotFoundException::new);

        motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        if (novoStatus == StatusLogisticoEntrega.NAO_ENTREGUE && (observacao == null || observacao.isBlank())) {
            throw new ObservacaoObrigatoriaException();
        }

        entrega.setStatusLogistico(novoStatus);
        entrega.setObservacaoNaoEntregue(novoStatus == StatusLogisticoEntrega.NAO_ENTREGUE ? observacao : null);
        aplicarBaixaAutomaticaSeAplicavel(entrega, user);
        entregaRepo.save(entrega);

        return entregaToResponse(entrega);
    }

    // Ao marcar Entregue uma entrega em Dinheiro ainda pendente de
    // recebimento, confirma o repasse automaticamente — opt-in via
    // Usuario.baixaAutomaticaAoEntregar (ver fluxo-entrega-configuracoes.md).
    // Mesmo efeito de darBaixa(), só que disparado pela mudança de status
    // logístico em vez de uma ação explícita do dono na tela Valores
    // Pendentes.
    private void aplicarBaixaAutomaticaSeAplicavel(Entrega entrega, Usuario user) {
        if (user.isBaixaAutomaticaAoEntregar()
                && entrega.getStatusLogistico() == StatusLogisticoEntrega.ENTREGUE
                && entrega.getFormaPagamento() == FormaPagamento.DINHEIRO
                && entrega.getStatus() == StatusRecebimento.PENDENTE) {
            entrega.setStatus(StatusRecebimento.RECEBIDO);
        }
    }

    // Página de entregas de UM status logístico específico (uma aba da tela
    // "Entregas Pendentes" = um status, inclusive ENTREGUE) — geral, ou de
    // um motoboy específico se motoboyId vier preenchido. Gated pela mesma
    // config do endpoint de escrita acima: defesa em profundidade, não só o
    // item de menu escondido no frontend.
    public PageResponseDTO<EntregaResponseDTO> findPorStatusLogistico(StatusLogisticoEntrega status, LocalDate startDate, LocalDate endDate,
                                                                        String motoboyId, Authentication auth, int page, int size) {
        Usuario user = (Usuario) auth.getPrincipal();
        if (!user.isControleFluxoEntregaHabilitado()) {
            throw new AcessoNegadoException();
        }
        validarIntervalo(startDate, endDate);
        Pageable pageable = pageableDescPorData(page, size);

        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            Page<Entrega> resultado = entregaRepo.findByMotoboyIdAndStatusLogisticoAndLocalDateBetweenUtc(
                    motoboyId, status, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
            return PageResponseDTO.from(resultado.map(this::entregaToResponse));
        }

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }
        Page<Entrega> resultado = entregaRepo.findByMotoboyIdInAndStatusLogisticoAndLocalDateBetweenUtc(
                motoboyIds, status, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
        return PageResponseDTO.from(resultado.map(this::entregaToResponse));
    }

    // Contagem por status no período — alimenta o badge de cada aba da tela
    // "Entregas Pendentes". Em memória (reaproveita a mesma busca já usada
    // pelos relatórios gerais), mesmo espírito do resto do sistema — não
    // precisa de uma query por status quando dá pra agrupar uma lista já
    // carregada.
    public ContagemStatusLogisticoDTO getContagemPorStatusLogistico(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth) {
        Usuario user = (Usuario) auth.getPrincipal();
        if (!user.isControleFluxoEntregaHabilitado()) {
            throw new AcessoNegadoException();
        }
        validarIntervalo(startDate, endDate);

        List<Entrega> entregas;
        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            entregas = entregaRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        } else {
            List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                    .map(Motoboy::getId)
                    .toList();
            entregas = motoboyIds.isEmpty()
                    ? List.of()
                    : entregaRepo.findByMotoboyIdInAndLocalDateBetweenUtc(
                            motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        }

        Map<StatusLogisticoEntrega, Long> porStatus = entregas.stream()
                .filter(e -> e.getStatusLogistico() != null)
                .collect(java.util.stream.Collectors.groupingBy(Entrega::getStatusLogistico, java.util.stream.Collectors.counting()));

        return new ContagemStatusLogisticoDTO(
                porStatus.getOrDefault(StatusLogisticoEntrega.NA_LOJA, 0L),
                porStatus.getOrDefault(StatusLogisticoEntrega.EM_ROTA, 0L),
                porStatus.getOrDefault(StatusLogisticoEntrega.NAO_ENTREGUE, 0L),
                porStatus.getOrDefault(StatusLogisticoEntrega.ENTREGUE, 0L));
    }

    // Alteração de status em massa — mesmo esqueleto de darBaixaEmMassa
    // (loop por id, valida que o motoboy pertence ao usuário logado, conta
    // quantos foram de fato atualizados). A observação (quando o novo status
    // é NAO_ENTREGUE) é a mesma pro lote inteiro — não dá pra pedir um
    // motivo diferente por item numa ação em massa.
    public int atualizarStatusLogisticoEmMassa(List<String> entregaIds, StatusLogisticoEntrega novoStatus,
                                                String observacao, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        if (!user.isControleFluxoEntregaHabilitado()) {
            throw new AcessoNegadoException();
        }
        if (novoStatus == StatusLogisticoEntrega.NAO_ENTREGUE && (observacao == null || observacao.isBlank())) {
            throw new ObservacaoObrigatoriaException();
        }

        int quantidadeAtualizada = 0;
        for (String entregaId : entregaIds) {
            Entrega entrega = entregaRepo.findById(entregaId)
                    .orElseThrow(EntregaNotFoundException::new);

            motoboyRepo.findByIdAndUsuarioId(entrega.getMotoboyId(), user.getId())
                    .orElseThrow(AcessoNegadoException::new);

            entrega.setStatusLogistico(novoStatus);
            entrega.setObservacaoNaoEntregue(novoStatus == StatusLogisticoEntrega.NAO_ENTREGUE ? observacao : null);
            aplicarBaixaAutomaticaSeAplicavel(entrega, user);
            entregaRepo.save(entrega);
            quantidadeAtualizada++;
        }
        return quantidadeAtualizada;
    }
}