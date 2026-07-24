package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.MetricasMasterResponseDTO;
import com.onioncode.entregas.dto.PontoSerieDTO;
import com.onioncode.entregas.dto.RankingEmpresaResponseDTO;
import com.onioncode.entregas.service.MetricasMasterService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/master")
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
