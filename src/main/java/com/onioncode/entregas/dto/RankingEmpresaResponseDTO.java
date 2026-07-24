package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RankingEmpresaResponseDTO {

    private String nomeEmpresa;
    private String emailEmpresa;
    private long quantidadeEntregas;
    private double faturamento;
}
