-- Troca de senha pendente de confirmação. Sem TTL nativo — ver
-- LimpezaExpiradosJob.
CREATE TABLE alteracoes_senha_pendentes (
    id              TEXT PRIMARY KEY,
    usuario_id      TEXT NOT NULL REFERENCES usuario(id),
    nova_senha_hash TEXT NOT NULL,
    codigo_hash     TEXT NOT NULL,
    tentativas      INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL,
    expira_em       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_alteracoes_senha_pendentes_usuario_id ON alteracoes_senha_pendentes (usuario_id);
CREATE INDEX idx_alteracoes_senha_pendentes_expira_em ON alteracoes_senha_pendentes (expira_em);
