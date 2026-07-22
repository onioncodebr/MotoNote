package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.EntregaResponseDTO;
import com.onioncode.entregas.dto.MotoboyResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoFaturamentoDTO;
import com.onioncode.entregas.service.EntregaService;
import com.onioncode.entregas.service.MotoboyService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

// Portal restrito do motoboy: só leitura, e sempre escopado ao próprio
// motoboy autenticado (nunca a um id vindo do request) — ver
// MotoboyAccessGateFilter, que é o que garante que só essas rotas (fora
// /api/auth/**) são alcançáveis por um token de Motoboy.
@RestController
@RequestMapping("/api/motoboy/me")
public class MotoboyPortalController {

    private final EntregaService entregaService;
    private final MotoboyService motoboyService;

    public MotoboyPortalController(EntregaService entregaService, MotoboyService motoboyService) {
        this.entregaService = entregaService;
        this.motoboyService = motoboyService;
    }

    @GetMapping
    public ResponseEntity<MotoboyResponseDTO> me(Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(motoboyService.motoboyToResponse(motoboy));
    }

    @GetMapping("/entregas")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> entregas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findAllByMotoboySelfPaged(motoboy.getId(), page, size));
    }

    @GetMapping("/relatorio")
    public ResponseEntity<List<EntregaResponseDTO>> relatorio(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findByMotoboyAndDateRangeSelf(motoboy.getId(), startDate, endDate));
    }

    // Versão paginada do mesmo relatório, usada pela tabela na tela — o
    // endpoint de cima (sem paginação) continua servindo o export.
    @GetMapping("/relatorio/pagina")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> relatorioPaginado(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findByMotoboyAndDateRangeSelfPaged(motoboy.getId(), startDate, endDate, page, size));
    }

    @GetMapping("/resumo")
    public ResponseEntity<ResumoFaturamentoDTO> resumo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.getResumoFaturamentoMotoboySelf(motoboy.getId(), startDate, endDate));
    }

    @PutMapping("/senha")
    public ResponseEntity<Void> alterarSenha(@RequestBody @Valid AlterarSenhaDTO dto, Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        motoboyService.alterarSenhaSelf(dto, motoboy);
        return ResponseEntity.noContent().build();
    }
}
