package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.dto.GastoResponseDTO;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.ResumoValorDTO;
import br.com.onioncode.motonote.service.GastoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

// Visão do dono da conta sobre os gastos registrados pelos motoboys —
// somente leitura de propósito: quem cria/edita/exclui um gasto é sempre o
// próprio motoboy (ver MotoboyPortalController), nunca o dono.
@RestController
@RequestMapping("/api/gastos")
public class GastoController {

    private final GastoService gastoService;

    public GastoController(GastoService gastoService) {
        this.gastoService = gastoService;
    }

    // GET /api/gastos?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)&page=&size=
    @GetMapping
    public ResponseEntity<PageResponseDTO<GastoResponseDTO>> findAll(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(gastoService.findAllByUserPaged(startDate, endDate, motoboyId, auth, page, size));
    }

    // GET /api/gastos/resumo?startDate=2026-07-01&endDate=2026-07-31&motoboyId=(opcional)
    @GetMapping("/resumo")
    public ResponseEntity<ResumoValorDTO> getResumo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String motoboyId,
            Authentication auth) {
        return ResponseEntity.ok(gastoService.getResumo(startDate, endDate, motoboyId, auth));
    }
}
