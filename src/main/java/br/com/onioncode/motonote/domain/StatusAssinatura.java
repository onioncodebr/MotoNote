package br.com.onioncode.motonote.domain;

public enum StatusAssinatura {
    // Vêm do Stripe (mapeados a partir do status da Subscription).
    TRIALING,
    ATIVA,
    INADIMPLENTE,
    CANCELADA,
    INCOMPLETA,
    // Status local, nunca vem do Stripe: usuário ainda não iniciou nenhum
    // checkout (cobre também os usuários que existiam antes dessa integração).
    SEM_ASSINATURA,
}
