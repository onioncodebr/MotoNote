-- Evento de analytics sem PII, standalone.
CREATE TABLE visita_pagina (
    id          TEXT PRIMARY KEY,
    tipo        VARCHAR(20) NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_visita_pagina_tipo ON visita_pagina (tipo);
CREATE INDEX idx_visita_pagina_criado_em ON visita_pagina (criado_em);
