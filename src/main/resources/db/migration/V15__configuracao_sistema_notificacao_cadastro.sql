-- E-mail configurável pelo MASTER pra ser notificado a cada novo cadastro
-- público (ver ConfiguracaoSistemaService/NotificacaoNovoCadastroService).
ALTER TABLE configuracao_sistema
    ADD COLUMN notificacao_cadastro_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN notificacao_cadastro_email TEXT;
