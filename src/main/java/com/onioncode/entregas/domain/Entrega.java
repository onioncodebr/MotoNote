package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

// Índice composto cobre tanto a listagem simples por motoboyId (prefixo do
// índice) quanto as consultas por intervalo de data, já na ordem usada pela
// paginação (mais recente primeiro).
@CompoundIndex(name = "motoboyId_localDate_idx", def = "{'motoboyId': 1, 'localDate': -1}")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Data
@Document(collection = "entrega")
public class Entrega {

    @Id
    private String id;
    private Double value;
    private LocalDate localDate;
    private String motoboyId;
    // Nulos em entregas antigas (gravadas antes desses campos existirem) —
    // as queries de pendências filtram por valor explícito, então essas
    // entregas antigas simplesmente não entram em nenhuma delas.
    private FormaPagamento formaPagamento;
    private StatusRecebimento status;
    // Valor do pedido (o que o cliente pagou em mãos ao motoboy, quando a
    // forma de pagamento é Dinheiro) — é esse valor, não o `value` (taxa da
    // entrega), que o motoboy precisa repassar ao caixa. Só preenchido
    // quando formaPagamento == DINHEIRO (ver EntregaService.save()).
    private Double valorPedido;
}
