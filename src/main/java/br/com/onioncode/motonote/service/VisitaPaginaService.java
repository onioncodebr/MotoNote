package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.TipoVisitaPagina;
import br.com.onioncode.motonote.domain.VisitaPagina;
import br.com.onioncode.motonote.repository.VisitaPaginaRepo;
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
        VisitaPagina visita = new VisitaPagina();
        visita.setTipo(tipo);
        visita.setCriadoEm(Instant.now());
        visitaPaginaRepo.save(visita);
    }
}
