-- Tabela singleton (uma única linha, id fixo "default") — equivalente ao
-- documento Mongo com ID_DEFAULT. O CHECK trava contra qualquer segunda
-- linha com id diferente. Não precisa de linha semeada aqui:
-- ConfiguracaoSistemaService já trata a ausência da linha com um valor
-- default em memória (orElseGet(ConfiguracaoSistema::new)) até o primeiro
-- salvamento pelo MASTER.
CREATE TABLE configuracao_sistema (
    id                                  TEXT PRIMARY KEY CHECK (id = 'default'),
    trial_days_override                 INTEGER,
    cadastro_publico_habilitado         BOOLEAN,
    rate_limit_login_max_tentativas     INTEGER,
    rate_limit_geral_max_tentativas     INTEGER,
    banner_habilitado                   BOOLEAN NOT NULL DEFAULT FALSE,
    banner_mensagem                     TEXT,
    contato_suporte_whatsapp            TEXT,
    contato_suporte_email               TEXT,
    popup_habilitado                    BOOLEAN NOT NULL DEFAULT FALSE,
    popup_titulo                        TEXT,
    popup_descricao                     TEXT,
    popup_botao_texto                   TEXT,
    popup_botao_url                     TEXT,
    popup_versao                        INTEGER NOT NULL DEFAULT 0,
    atualizado_em                       TIMESTAMPTZ,
    atualizado_por                      TEXT
);
