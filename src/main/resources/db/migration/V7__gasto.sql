-- Gasto do motoboy (pneu, gasolina, óleo etc). comprovante_key: key do
-- objeto no bucket privado do R2, não a URL (que é assinada e expira).
CREATE TABLE gasto (
    id                  TEXT PRIMARY KEY,
    motoboy_id          TEXT NOT NULL REFERENCES motoboy(id),
    descricao           TEXT NOT NULL,
    value               DOUBLE PRECISION NOT NULL,
    local_date          DATE NOT NULL,
    comprovante_key     TEXT
);

CREATE INDEX idx_gasto_motoboy_localdate ON gasto (motoboy_id, local_date DESC);
