package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.EntregaRequestDTO;
import com.onioncode.entregas.dto.EntregaResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoFaturamentoDTO;
import com.onioncode.entregas.service.EntregaService;
import jakarta.validation.Valid;
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
