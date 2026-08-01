-- Tenant/dono da conta do SaaS. id TEXT: reaproveita o ObjectId hex
-- do Mongo como chave primária (ver migration/ — importação do backup),
-- preservando todas as referências das outras tabelas sem remapeamento.
CREATE TABLE usuario (
    id                                  TEXT PRIMARY KEY,
    name                                TEXT NOT NULL,
    email                               TEXT NOT NULL,
    password                            TEXT NOT NULL,
    role                                VARCHAR(20) NOT NULL,
    phone                               TEXT,
    -- Nullable: contas bem antigas no backup real não têm esse campo
    -- gravado no Mongo (criadas antes dele existir) — confirmado ao rodar
    -- a importação contra um backup de produção real.
    created_at                         TIMESTAMPTZ,
    foto_url                           TEXT,
    ativo                               BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso_em                   TIMESTAMPTZ,
    modo_valor_pedido_obrigatorio       VARCHAR(30),
    permitir_dados_cliente              BOOLEAN NOT NULL DEFAULT FALSE,
    controle_fluxo_entrega_habilitado  BOOLEAN NOT NULL DEFAULT FALSE,
    permitir_cadastro_clientes          BOOLEAN NOT NULL DEFAULT FALSE,
    baixa_automatica_ao_entregar        BOOLEAN NOT NULL DEFAULT FALSE,
    mostrar_faturamento_pedidos         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_usuario_email ON usuario (email);
