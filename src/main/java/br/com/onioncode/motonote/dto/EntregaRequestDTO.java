package br.com.onioncode.motonote.dto;

import br.com.onioncode.motonote.domain.FormaPagamento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaRequestDTO {

    @NotNull
    @Positive
    private Double value;
    @NotBlank
    private String motoboyId;

    @NotNull(message = "A forma de pagamento é obrigatória")
    private FormaPagamento formaPagamento;

    // Valor do pedido (o que o motoboy recebeu em mãos e precisa trazer pro
    // caixa) — só obrigatório quando formaPagamento é DINHEIRO; validado
    // manualmente em EntregaService.save() porque a obrigatoriedade depende
    // de outro campo do mesmo DTO.
    @Positive
    private Double valorPedido;

    // Opcional: data em que a entrega foi (ou vai ser) realizada. Quando não
    // informada, o backend assume a data atual. Aceita datas futuras de
    // propósito — dá pra registrar uma entrega agendada com antecedência.
    private LocalDate date;

    // Nome do cliente + descrição do pedido — opcionais no DTO (a
    // obrigatoriedade depende de Usuario.permitirDadosCliente, validada
    // manualmente em EntregaService.save(), não dá pra usar @NotBlank
    // estático aqui).
    private String nomeCliente;
    private String descricaoPedido;

    // Cliente cadastrado vinculado a esta entrega — opcional mesmo com
    // Usuario.permitirCadastroClientes ligado (nem toda entrega precisa
    // ter um cliente vinculado). Validado contra o tenant logado em
    // EntregaService.save().
    private String clienteId;
}
