-- Motoboy do tenant. email/password nullable (login do portal do motoboy é
-- opt-in, preenchido pelo dono da conta depois de criado) — email único,
-- mas o Postgres já trata múltiplos NULL como não-conflitantes por padrão,
-- equivalente ao índice "sparse" que existia no Mongo.
CREATE TABLE motoboy (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    usuario_id  TEXT NOT NULL REFERENCES usuario(id),
    email       TEXT,
    password    TEXT
);

CREATE INDEX idx_motoboy_usuario_id ON motoboy (usuario_id);
CREATE UNIQUE INDEX uq_motoboy_email ON motoboy (email);
