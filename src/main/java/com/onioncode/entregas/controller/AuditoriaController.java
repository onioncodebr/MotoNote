package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.TipoAcaoAuditoria;
import com.onioncode.entregas.dto.AuditLogResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.service.AuditoriaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    // desde/ate no formato de data simples (yyyy-MM-dd, ex.: filtro de
    // período de <input type="date"> no frontend) — mesmo padrão de
    // startDate/endDate já usado em EntregaController, convertidos pra
    // limites UTC dentro do service.
    @GetMapping("/findAll")
    public ResponseEntity<PageResponseDTO<AuditLogResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TipoAcaoAuditoria acao,
            @RequestParam(required = false) String ator,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(auditoriaService.findAllPaged(authentication, page, size, acao, ator, desde, ate));
    }
}
