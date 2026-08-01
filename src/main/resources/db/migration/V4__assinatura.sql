-- Relação 1:1 com Usuario (integração Stripe).
CREATE TABLE assinatura (
    id                          TEXT PRIMARY KEY,
    usuario_id                  TEXT NOT NULL REFERENCES usuario(id),
    stripe_customer_id          TEXT,
    stripe_subscription_id      TEXT,
    status                      VARCHAR(20) NOT NULL,
    trial_termina_em            TIMESTAMPTZ,
    periodo_atual_termina_em    TIMESTAMPTZ,
    criado_em                   TIMESTAMPTZ,
    atualizado_em               TIMESTAMPTZ,
    trial_termina_em_avisado    TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_assinatura_usuario_id ON assinatura (usuario_id);
CREATE INDEX idx_assinatura_status ON assinatura (status);
