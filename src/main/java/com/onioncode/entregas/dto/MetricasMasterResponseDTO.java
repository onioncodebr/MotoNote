package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.StatusAssinatura;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class MetricasMasterResponseDTO {

    private long totalUsuarios;
    private long totalMotoboys;
    private long totalEntregas;
    private double mrr;
    private String moeda;
    private Map<StatusAssinatura, Long> usuariosPorStatus;
    // Ativos nos últimos 15 min — aproximação de "logado agora" (ver
    // Usuario.ultimoAcessoEm; não existe sessão com estado nesse login).
    private long usuariosAtivosAgora;
    // Snapshot atual (não é funil por coorte de tempo): ATIVA / (TRIALING +
    // ATIVA + CANCELADA + INADIMPLENTE), em percentual (0-100).
    private double taxaConversaoTrial;
}
