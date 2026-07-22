package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumoFaturamentoDTO {

    private Integer quantidadeEntregas;
    private Double valorTotal;
}
