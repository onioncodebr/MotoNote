package com.onioncode.entregas.domain;

public enum ModoValorPedidoObrigatorio {
    // Comportamento legado: só obrigatório quando formaPagamento == DINHEIRO.
    SOMENTE_DINHEIRO,
    // Obrigatório em qualquer forma de pagamento.
    TODAS_ENTREGAS
}
