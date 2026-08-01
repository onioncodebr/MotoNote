-- Cadastro público ainda não confirmado. Sem TTL nativo no Postgres (ao
-- contrário do Mongo, expireAfterSeconds=0) — a limpeza é feita por
-- LimpezaExpiradosJob (@Scheduled), que apaga linhas com expira_em no
-- passado; o índice abaixo é pra esse job, não pra correção nenhuma.
CREATE TABLE cadastros_pendentes (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    phone       TEXT,
    senha_hash  TEXT NOT NULL,
    codigo_hash TEXT NOT NULL,
    tentativas  INTEGER NOT NULL DEFAULT 0,
    criado_em   TIMESTAMPTZ NOT NULL,
    expira_em   TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_cadastros_pendentes_email ON cadastros_pendentes (email);
CREATE INDEX idx_cadastros_pendentes_expira_em ON cadastros_pendentes (expira_em);
