package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.domain.StatusLogisticoEntrega;
import br.com.onioncode.motonote.dto.BaixaEmMassaResponseDTO;
import br.com.onioncode.motonote.dto.ContagemStatusLogisticoDTO;
import br.com.onioncode.motonote.dto.EntregaRequestDTO;
import br.com.onioncode.motonote.dto.EntregaResponseDTO;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.ResumoFaturamentoDTO;
import br.com.onioncode.motonote.service.EntregaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/entregas")
public class EntregaController {

    private final EntregaService entregaService;

    public EntregaController(EntregaService entregaService) {
        this.entregaService = entregaService;
    }

    // --- 1. Criar Entrega ---
    @PostMapping
    public ResponseEntity<EntregaResponseDTO> create(@RequestBody @Valid EntregaRequestDTO dto, Authentication auth) {
        EntregaResponseDTO response = entregaService.save(dto, auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(response); // 201 Created
    }

    // --- DTO auxiliar para validar o update do valor ---
    public record UpdateValorDTO(
            @NotNull(message = "O valor é obrigatório")
            @Positive(message = "O valor deve ser maior que zero")
            Double value
    ) {
    }

    // --- 2. Atualizar Valor da Entrega ---
    @PatchMapping("/{id}/valor")
    public ResponseEntity<EntregaResponseDTO> updateValue(
            @PathVariable String id,
            @RequestBody @Valid UpdateValorDTO dto,
            Authentication auth) {
        EntregaResponseDTO response = entregaService.updateValue(id, dto.value(), auth);
        return ResponseEntity.ok(response);
    }

    // --- 2b. Dar baixa (confirmar recebimento em dinheiro) ---
    @PatchMapping("/{id}/baixa")
    public ResponseEntity<EntregaResponseDTO> darBaixa(@PathVariable String id, Authentication auth) {
        EntregaResponseDTO response = entregaService.darBaixa(id, auth);
        return ResponseEntity.ok(response);
    }

    // --- DTO auxiliar para o corpo da baixa em massa ---
    public record BaixaEmMassaRequestDTO(
            @NotEmpty(message = "Selecione ao menos uma entrega")
            List<String> ids
    ) {
    }

    // --- 2c. Dar baixa em massa ---
    @PatchMapping("/baixa-em-massa")
    public ResponseEntity<BaixaEmMassaResponseDTO> darBaixaEmMassa(
            @RequestBody @Valid BaixaEmMassaRequestDTO dto,
            Authentication auth) {
        BaixaEmMassaResponseDTO response = entregaService.darBaixaEmMassa(dto.ids(), auth);
        return ResponseEntity.ok(response);
    }

    // --- 3. Excluir Entrega ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        entregaService.delete(id, auth);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    // --- 4. Buscar Uma Entrega pelo ID ---
    @GetMapping("/{id}")
    public ResponseEntity<EntregaResponseDTO> findById(@PathVariable String id, Authentication auth) {
        EntregaResponseDTO response = entregaService.findById(id, auth);
        return ResponseEntity.ok(response);
    }

    // --- 5. Buscar as entregas do Usuário Logado (paginado, mais recentes primeiro) ---
    @GetMapping
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> findAllByUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.findAllByUserPaged(auth, page, size));
    }

    // --- 6. Buscar entregas do Usuário Logado por DATA (Faturamento Geral Diário) ---
    // Exemplo de URL: GET /entregas/data?date=2026-07-19
    @GetMapping("/data")
    public ResponseEntity<List<EntregaResponseDTO>> findAllByUserAndDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        List<EntregaResponseDTO> list = entregaService.findAllByUserAndDate(date, auth);
        return ResponseEntity.ok(list);
    }

    // --- 7. Buscar entregas de UM Motoboy ---
    @GetMapping("/motoboy/{motoboyId}")
    public ResponseEntity<List<EntregaResponseDTO>> findAllByMotoboy(
            @PathVariable String motoboyId,
            Authentication auth) {
        List<EntregaResponseDTO> list = entregaService.findAllByMotoboy(motoboyId, auth);
        return ResponseEntity.ok(list);
    }

    // --- 8. Buscar entregas de UM Motoboy por DATA (Fechamento Diário do Motoboy) ---
    // Exemplo de URL: GET /entregas/motoboy/123/data?date=2026-07-19
    @GetMapping("/motoboy/{motoboyId}/data")
    public ResponseEntity<List<EntregaResponseDTO>> findByMotoboyAndDate(
            @PathVariable String motoboyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        List<EntregaResponseDTO> list = entregaService.findByMotoboyAndDate(motoboyId, date, auth);
        return ResponseEntity.ok(list);
    }

    // Rota para o relatório GERAL
// GET /entregas/relatorio?startDate=2026-07-01&endDate=2026-07-31
    @GetMapping("/relatorio")
    public ResponseEntity<List<EntregaResponseDTO>> findGeneralReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication auth) {

        List<EntregaResponseDTO> list = entregaService.findAllByUserAndDateRange(startDate, endDate, auth);
        return ResponseEntity.ok(list);
    }

    // Rota para o relatório de UM MOTOBOY
// GET /entregas/motoboy/123/relatorio?startDate=2026-07-12&endDate=2026-07-19
    @GetMapping("/motoboy/{motoboyId}/relatorio")
    public ResponseEntity<List<EntregaResponseDTO>> findMotoboyReport(
            @PathVariable String motoboyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication auth) {

        List<EntregaResponseDTO> list = entregaService.findByMotoboyAndDateRange(motoboyId, startDate, endDate, auth);
        return ResponseEntity.ok(list);
    }

    // Versão paginada do relatório (geral, ou de um motoboy se motoboyId
    // for informado), usada pela tabela da tela de Relatórios — os dois
    // endpoints de cima (sem paginação) continuam existindo e agora servem
    // só pra exportação (que precisa do período inteiro de uma vez).
    // GET /entregas/relatorio/pagina?startDate=...&endDate=...&motoboyId=(opcional)&page=&size=
    @GetMapping("/relatorio/pagina")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> findReportPaged(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.findReportPaged(startDate, endDate, motoboyId, auth, page, size));
    }

    // --- 9. Resumo Financeiro (Soma Total) ---
    // Exemplo de URL: GET /entregas/resumo?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)
    @GetMapping("/resumo")
    public ResponseEntity<ResumoFaturamentoDTO> getResumoFinanceiro(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            Authentication auth) {

        ResumoFaturamentoDTO resumo = entregaService.getResumoFaturamento(startDate, endDate, motoboyId, auth);
        return ResponseEntity.ok(resumo);
    }

    // --- 10. Entregas pendentes de recebimento em dinheiro (paginado) ---
    // GET /entregas/pendentes?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)&page=&size=
    @GetMapping("/pendentes")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> findPendentes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.findPendentes(startDate, endDate, motoboyId, auth, page, size));
    }

    // --- 11. Resumo dos valores pendentes em dinheiro ---
    // GET /entregas/pendentes/resumo?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)
    @GetMapping("/pendentes/resumo")
    public ResponseEntity<ResumoFaturamentoDTO> getResumoPendentes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.getResumoPendentes(startDate, endDate, motoboyId, auth));
    }

    // --- Fluxo logístico da entrega (Na loja/Em rota/Não foi possível
    // entregar/Entregue) — opt-in via Usuario.controleFluxoEntregaHabilitado,
    // gated dentro do service (403 se a conta não tiver habilitado). ---

    public record AtualizarStatusLogisticoDTO(
            @NotNull(message = "O status é obrigatório") StatusLogisticoEntrega status,
            String observacao
    ) {
    }

    @PatchMapping("/{id}/status-logistico")
    public ResponseEntity<EntregaResponseDTO> atualizarStatusLogistico(
            @PathVariable String id, @RequestBody @Valid AtualizarStatusLogisticoDTO dto, Authentication auth) {
        return ResponseEntity.ok(entregaService.atualizarStatusLogistico(id, dto.status(), dto.observacao(), auth));
    }

    // Uma aba da tela "Entregas Pendentes" = um status específico (inclusive
    // ENTREGUE) — diferente da versão anterior, que trazia um conjunto fixo
    // de status "não concluídos" numa lista só.
    // GET /api/entregas/fluxo?status=NA_LOJA&startDate=...&endDate=...&motoboyId=(opcional)&page=&size=
    @GetMapping("/fluxo")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> findPorStatusLogistico(
            @RequestParam StatusLogisticoEntrega status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.findPorStatusLogistico(status, startDate, endDate, motoboyId, auth, page, size));
    }

    // Contagem por status no período — alimenta o badge de cada aba.
    // GET /api/entregas/fluxo/contagem?startDate=...&endDate=...&motoboyId=(opcional)
    @GetMapping("/fluxo/contagem")
    public ResponseEntity<ContagemStatusLogisticoDTO> getContagemPorStatusLogistico(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            Authentication auth) {
        return ResponseEntity.ok(entregaService.getContagemPorStatusLogistico(startDate, endDate, motoboyId, auth));
    }

    public record AtualizarStatusLogisticoEmMassaDTO(
            @NotEmpty(message = "Selecione ao menos uma entrega") List<String> ids,
            @NotNull(message = "O status é obrigatório") StatusLogisticoEntrega status,
            String observacao
    ) {
    }

    // PATCH /api/entregas/status-logistico-em-massa
    @PatchMapping("/status-logistico-em-massa")
    public ResponseEntity<BaixaEmMassaResponseDTO> atualizarStatusLogisticoEmMassa(
            @RequestBody @Valid AtualizarStatusLogisticoEmMassaDTO dto, Authentication auth) {
        int quantidade = entregaService.atualizarStatusLogisticoEmMassa(dto.ids(), dto.status(), dto.observacao(), auth);
        return ResponseEntity.ok(new BaixaEmMassaResponseDTO(quantidade));
    }
}

//
//Resumo das URLs para o seu Front-end:
//Criar (POST): http://localhost:8080/entregas
//
//Atualizar Valor (PATCH): http://localhost:8080/entregas/ID_DA_ENTREGA/valor (Mandar { "value": 15.50 } no body)
//
//Deletar (DELETE): http://localhost:8080/entregas/ID_DA_ENTREGA
//
//Buscar geral (GET): http://localhost:8080/entregas
//
//Buscar geral de hoje (GET): http://localhost:8080/entregas/data?date=2026-07-19
//
//Buscar de um motoboy (GET): http://localhost:8080/entregas/motoboy/ID_DO_MOTOBOY
//
//Buscar de um motoboy hoje (GET): http://localhost:8080/entregas/motoboy/ID_DO_MOTOBOY/data?date=2026-07-19
