package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

// Cliente + estatísticas calculadas em memória a partir das Entrega
// vinculadas (ver ClienteService.buscarRankingPaginado), mesma técnica já
// usada em MetricasMasterService.rankingEmpresas.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClienteRankingResponseDTO {

    private ClienteResponseDTO cliente;
    private long quantidadePedidos;
    private double totalGasto;
    // Null quando quantidadePedidos == 0 (sem pedido no período) — evita
    // NaN/Infinity de uma divisão por zero.
    private Double ticketMedio;
    private LocalDate ultimaEntregaEm;
}
