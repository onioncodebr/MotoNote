package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Resumo genérico (quantidade + soma) usado por listagens que não são de
// entrega/faturamento — ex.: Gastos e Vales. ResumoFaturamentoDTO continua
// só pros endpoints de faturamento/pendências de Entrega.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumoValorDTO {

    private Integer quantidade;
    private Double valorTotal;
}
