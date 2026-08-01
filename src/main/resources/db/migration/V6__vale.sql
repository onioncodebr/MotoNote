-- Adiantamento/desconto do motoboy. grupo_parcelamento/numero_parcela/
-- total_parcelas preenchidos só quando o vale nasceu de um parcelamento.
CREATE TABLE vale (
    id                  TEXT PRIMARY KEY,
    motoboy_id          TEXT NOT NULL REFERENCES motoboy(id),
    descricao           TEXT NOT NULL,
    value               DOUBLE PRECISION NOT NULL,
    status              VARCHAR(20) NOT NULL,
    local_date          DATE NOT NULL,
    grupo_parcelamento  TEXT,
    numero_parcela      INTEGER,
    total_parcelas      INTEGER
);

CREATE INDEX idx_vale_motoboy_localdate ON vale (motoboy_id, local_date DESC);
