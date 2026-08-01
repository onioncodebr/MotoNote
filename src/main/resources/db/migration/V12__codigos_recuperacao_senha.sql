-- Código de recuperação de senha. Sem TTL nativo — ver LimpezaExpiradosJob.
CREATE TABLE codigos_recuperacao_senha (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    codigo_hash TEXT NOT NULL,
    tentativas  INTEGER NOT NULL DEFAULT 0,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ NOT NULL,
    expira_em   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_codigos_recuperacao_senha_email ON codigos_recuperacao_senha (email);
CREATE INDEX idx_codigos_recuperacao_senha_expira_em ON codigos_recuperacao_senha (expira_em);
