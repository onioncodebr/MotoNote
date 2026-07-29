package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.TipoVisitaPagina;
import com.onioncode.entregas.service.VisitaPaginaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Endpoint público (permitAll no SecurityConfig): landing page e tela de
// criar conta chamam isso ainda anônimas, antes de existir qualquer sessão.
@RestController
@RequestMapping("/api/analytics")
public class VisitaPaginaController {

    private final VisitaPaginaService visitaPaginaService;

    public VisitaPaginaController(VisitaPaginaService visitaPaginaService) {
        this.visitaPaginaService = visitaPaginaService;
    }

    @PostMapping("/visita/{tipo}")
    public ResponseEntity<Void> registrarVisita(@PathVariable TipoVisitaPagina tipo) {
        visitaPaginaService.registrar(tipo);
        return ResponseEntity.noContent().build();
    }
}
