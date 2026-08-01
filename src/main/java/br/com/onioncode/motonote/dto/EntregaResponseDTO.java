package br.com.onioncode.motonote.dto;

import br.com.onioncode.motonote.domain.FormaPagamento;
import br.com.onioncode.motonote.domain.StatusLogisticoEntrega;
import br.com.onioncode.motonote.domain.StatusRecebimento;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaResponseDTO {

    private String id;
    private Double value;
    private LocalDate localDate;
    private String motoboyId;
    private FormaPagamento formaPagamento;
    private StatusRecebimento status;
    private Double valorPedido;
    private String nomeCliente;
    private String descricaoPedido;
    private String clienteId;
    private StatusLogisticoEntrega statusLogistico;
    private String observacaoNaoEntregue;
}
