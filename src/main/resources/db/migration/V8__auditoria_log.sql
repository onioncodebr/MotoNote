-- Log de ações administrativas do MASTER. actor_id/alvo_id sem FOREIGN KEY
-- de propósito: é um log histórico que precisa sobreviver à exclusão do
-- usuário-alvo (ação USUARIO_EXCLUIDO) e alvo_id/alvo_tipo são
-- polimórficos (podem apontar pra outros tipos de entidade além de
-- Usuario, conforme a ação).
CREATE TABLE auditoria_log (
    id              TEXT PRIMARY KEY,
    actor_id         TEXT,
    actor_nome       TEXT,
    actor_email      TEXT,
    acao             VARCHAR(40) NOT NULL,
    alvo_tipo        TEXT,
    alvo_id          TEXT,
    alvo_descricao   TEXT,
    detalhes         JSONB,
    criado_em        TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_auditoria_log_criado_em ON auditoria_log (criado_em);
