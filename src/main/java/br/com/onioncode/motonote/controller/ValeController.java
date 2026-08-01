package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.domain.StatusVale;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.ResumoValorDTO;
import br.com.onioncode.motonote.dto.ValeParceladoRequestDTO;
import br.com.onioncode.motonote.dto.ValeRequestDTO;
import br.com.onioncode.motonote.dto.ValeResponseDTO;
import br.com.onioncode.motonote.service.ValeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

// Vales (adiantamento de pagamento ou produto a descontar): CRUD completo
// só pro dono da conta — o motoboy só visualiza os seus (ver
// MotoboyPortalController, sem nenhum endpoint de escrita ali).
@RestController
@RequestMapping("/api/vales")
public class ValeController {

    private final ValeService valeService;

    public ValeController(ValeService valeService) {
        this.valeService = valeService;
    }

    @PostMapping
    public ResponseEntity<ValeResponseDTO> create(@RequestBody @Valid ValeRequestDTO dto, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(valeService.create(dto, auth));
    }

    // Cria um vale parcelado: N lançamentos independentes, um por parcela
    // informada (valor e data de cada uma vêm do próprio request, sem
    // divisão automática de um total).
    @PostMapping("/parcelado")
    public ResponseEntity<List<ValeResponseDTO>> createParcelado(
            @RequestBody @Valid ValeParceladoRequestDTO dto, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(valeService.createParcelado(dto, auth));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ValeResponseDTO> update(
            @PathVariable String id,
            @RequestBody @Valid ValeRequestDTO dto,
            Authentication auth) {
        return ResponseEntity.ok(valeService.update(id, dto, auth));
    }

    // --- DTO auxiliar para validar o update de status ---
    public record UpdateStatusDTO(
            @NotNull(message = "O status é obrigatório")
            StatusVale status
    ) {
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ValeResponseDTO> updateStatus(
            @PathVariable String id,
            @RequestBody @Valid UpdateStatusDTO dto,
            Authentication auth) {
        return ResponseEntity.ok(valeService.updateStatus(id, dto.status(), auth));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        valeService.delete(id, auth);
        return ResponseEntity.noContent().build();
    }

    // GET /api/vales?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)&status=(opcional: PENDENTE/CONCLUIDO)&page=&size=
    @GetMapping
    public ResponseEntity<PageResponseDTO<ValeResponseDTO>> findAll(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            @RequestParam(required = false) StatusVale status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(valeService.findAllByUserPaged(startDate, endDate, motoboyId, status, auth, page, size));
    }

    // GET /api/vales/resumo?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)
    @GetMapping("/resumo")
    public ResponseEntity<ResumoValorDTO> getResumo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            Authentication auth) {
        return ResponseEntity.ok(valeService.getResumo(startDate, endDate, motoboyId, auth));
    }
}
