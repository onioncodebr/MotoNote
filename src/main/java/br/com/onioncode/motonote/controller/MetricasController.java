package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.dto.MetricasMasterResponseDTO;
import br.com.onioncode.motonote.dto.PontoSerieDTO;
import br.com.onioncode.motonote.dto.RankingEmpresaResponseDTO;
import br.com.onioncode.motonote.service.MetricasMasterService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/master")
// Todos os endpoints deste controller são MASTER-only — anotação na
// classe em vez de repetir em cada método (ver melhorias.md 1.1).
@PreAuthorize("hasRole('MASTER')")
public class MetricasController {

    private final MetricasMasterService metricasMasterService;

    public MetricasController(MetricasMasterService metricasMasterService) {
        this.metricasMasterService = metricasMasterService;
    }

    @GetMapping("/metricas")
    public MetricasMasterResponseDTO metricas(Authentication authentication) {
        return metricasMasterService.calcular(authentication);
    }

    @GetMapping("/metricas/cadastros-por-dia")
    public List<PontoSerieDTO> cadastrosPorDia(@RequestParam(defaultValue = "30") int dias, Authentication authentication) {
        return metricasMasterService.cadastrosPorDia(authentication, dias);
    }

    @GetMapping("/metricas/entregas-por-dia")
    public List<PontoSerieDTO> entregasPorDia(@RequestParam(defaultValue = "30") int dias, Authentication authentication) {
        return metricasMasterService.entregasPorDia(authentication, dias);
    }

    @GetMapping("/metricas/ranking-empresas")
    public List<RankingEmpresaResponseDTO> rankingEmpresas(
            @RequestParam(defaultValue = "30") int dias,
            @RequestParam(defaultValue = "10") int limite,
            Authentication authentication) {
        return metricasMasterService.rankingEmpresas(authentication, dias, limite);
    }
}
