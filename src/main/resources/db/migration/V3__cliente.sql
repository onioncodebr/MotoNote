-- Cliente final da conta (quem recebe as entregas) — cadastro opcional, sem
-- login. Endereço estruturado (rua/numero/bairro/cidade obrigatórios,
-- complemento opcional), mesmo padrão do documento Mongo original.
CREATE TABLE cliente (
    id          TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    telefone    TEXT NOT NULL,
    rua         TEXT NOT NULL,
    numero      TEXT NOT NULL,
    bairro      TEXT NOT NULL,
    cidade      TEXT NOT NULL,
    complemento TEXT,
    usuario_id  TEXT NOT NULL REFERENCES usuario(id),
    criado_em   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cliente_usuario_id ON cliente (usuario_id);
