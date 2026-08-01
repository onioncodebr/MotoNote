-- Entidade central do domínio. forma_pagamento/status/status_logistico
-- nullable: entregas antigas foram gravadas antes desses campos existirem
-- (mesmo comportamento do Mongo — nunca populados retroativamente).
CREATE TABLE entrega (
    id                      TEXT PRIMARY KEY,
    value                   DOUBLE PRECISION NOT NULL,
    local_date              DATE NOT NULL,
    motoboy_id              TEXT NOT NULL REFERENCES motoboy(id),
    forma_pagamento         VARCHAR(20),
    status                  VARCHAR(20),
    valor_pedido            DOUBLE PRECISION,
    nome_cliente            TEXT,
    descricao_pedido        TEXT,
    cliente_id              TEXT REFERENCES cliente(id),
    status_logistico        VARCHAR(20),
    observacao_nao_entregue TEXT
);

-- Cobre tanto a listagem simples por motoboy_id (prefixo do índice) quanto
-- as consultas por intervalo de data, já na ordem usada pela paginação
-- (mais recente primeiro) — equivalente ao "motoboyId_localDate_idx" do Mongo.
CREATE INDEX idx_entrega_motoboy_localdate ON entrega (motoboy_id, local_date DESC);
