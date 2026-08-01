package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Tabela singleton (uma única linha, id fixo "default", ver
// V9__configuracao_sistema.sql) com ajustes operacionais do SaaS editáveis
// pelo MASTER sem precisar de redeploy. O Price ID do Stripe continua fixo
// via env var de propósito (ver ConfiguracaoSistemaService). Lido com muita
// frequência (inclusive em AuthRateLimitFilter, que roda em toda
// requisição) — ver o cache em ConfiguracaoSistemaService.efetiva(), não
// bater direto no repo fora dali.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "configuracao_sistema")
public class ConfiguracaoSistema extends EntidadeComIdAssinalavel {

    public static final String ID_DEFAULT = "default";

    // Null = usa o valor do properties (stripe.trial-days) sem override.
    private Integer trialDaysOverride;

    // Documento já existe em produção sem este campo — precisa ser um
    // Boolean (objeto) nullable, não um boolean primitivo: um primitivo
    // desserializaria ausência como "false" e desligaria o cadastro público
    // sozinho no primeiro deploy desta mudança. Convenção: null/true =
    // habilitado, só false explícito desativa.
    private Boolean cadastroPublicoHabilitado;

    // Escopo reduzido de propósito a só esses dois pares (ver
    // AuthRateLimitFilter) — login (alvo clássico de brute-force) e geral
    // (a rede de segurança mais provável de barrar tráfego legítimo se
    // ficar apertada demais). Null = usa a constante hardcoded atual.
    private Integer rateLimitLoginMaxTentativas;
    private Integer rateLimitGeralMaxTentativas;

    // Banner e popup são o oposto do cadastroPublicoHabilitado: seguro por
    // padrão é DESLIGADO (primitivo boolean, ausência = false, de propósito
    // — nada aparece pra ninguém até o MASTER ligar isso manualmente).
    private boolean bannerHabilitado;
    private String bannerMensagem;

    // Null = usa o valor de build do frontend (VITE_WHATSAPP_NUMBER).
    private String contatoSuporteWhatsapp;
    private String contatoSuporteEmail;

    private boolean popupHabilitado;
    private String popupTitulo;
    private String popupDescricao;
    private String popupBotaoTexto;
    private String popupBotaoUrl;
    // Incrementado a cada PUT /popup salvo — o frontend guarda a última
    // versão vista (localStorage) e só reexibe o popup quando esse número
    // muda, pra não aparecer de novo a cada login.
    private int popupVersao;

    // Notificação por e-mail ao MASTER a cada novo cadastro público (signup
    // direto ou confirmado em duas etapas) — ver NotificacaoNovoCadastroService.
    // Desligado por padrão (mesma convenção de banner/popup): nada é enviado
    // até o MASTER configurar um e-mail e ligar explicitamente.
    private boolean notificacaoCadastroHabilitado;
    private String notificacaoCadastroEmail;

    private Instant atualizadoEm;
    private String atualizadoPor;
}
