package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.TipoVisitaPagina;
import com.onioncode.entregas.domain.VisitaPagina;
import com.onioncode.entregas.repository.VisitaPaginaRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;

// Registro de visitas às páginas públicas (landing e criar conta), chamado
// sem autenticação (ver VisitaPaginaController) — a leitura agregada desses
// números vive em MetricasMasterService, junto com o resto do Painel Master.
@Service
public class VisitaPaginaService {

    private final VisitaPaginaRepo visitaPaginaRepo;

    public VisitaPaginaService(VisitaPaginaRepo visitaPaginaRepo) {
        this.visitaPaginaRepo = visitaPaginaRepo;
    }

    public void registrar(TipoVisitaPagina tipo) {
        visitaPaginaRepo.save(new VisitaPagina(null, tipo, Instant.now()));
    }
}
