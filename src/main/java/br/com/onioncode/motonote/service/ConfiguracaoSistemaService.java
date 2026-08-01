package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.ConfiguracaoSistema;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.AtualizarBannerDTO;
import br.com.onioncode.motonote.dto.AtualizarCadastroPublicoDTO;
import br.com.onioncode.motonote.dto.AtualizarConfiguracaoDTO;
import br.com.onioncode.motonote.dto.AtualizarContatoSuporteDTO;
import br.com.onioncode.motonote.dto.AtualizarNotificacaoCadastroDTO;
import br.com.onioncode.motonote.dto.AtualizarPopupDTO;
import br.com.onioncode.motonote.dto.AtualizarRateLimitDTO;
import br.com.onioncode.motonote.dto.ConfiguracaoExibicaoResponseDTO;
import br.com.onioncode.motonote.dto.ConfiguracaoSistemaResponseDTO;
import br.com.onioncode.motonote.exception.AcessoNegadoException;
import br.com.onioncode.motonote.repository.ConfiguracaoSistemaRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

// Ajustes operacionais do SaaS editáveis pelo MASTER sem redeploy. O Price ID
// do Stripe (o que é cobrado) continua fixo via env var, decisão rara demais
// e crítica demais pra virar um campo solto num formulário.
@Service
public class ConfiguracaoSistemaService {

    private static final int RATE_LIMIT_LOGIN_PADRAO = 10;
    private static final int RATE_LIMIT_GERAL_PADRAO = 300;

    private final ConfiguracaoSistemaRepo configuracaoSistemaRepo;
    private final AuditoriaService auditoriaService;

    // Cache simples em memória, sem TTL — invalidado manualmente (cache.set)
    // toda vez que algum atualizarXxx() salva. Lido com muita frequência
    // (AuthRateLimitFilter roda em toda requisição), um round-trip ao Mongo
    // por request não é aceitável; mesma filosofia "single-instance por
    // enquanto" já documentada em RateLimiter — se um dia isso rodar atrás
    // de load balancer com múltiplas instâncias, precisa virar algo
    // compartilhado (Redis).
    private final AtomicReference<ConfiguracaoSistema> cache = new AtomicReference<>();

    @Value("${stripe.trial-days}")
    private long trialDaysPadrao;

    public ConfiguracaoSistemaService(ConfiguracaoSistemaRepo configuracaoSistemaRepo, AuditoriaService auditoriaService) {
        this.configuracaoSistemaRepo = configuracaoSistemaRepo;
        this.auditoriaService = auditoriaService;
    }

    private ConfiguracaoSistema efetiva() {
        ConfiguracaoSistema atual = cache.get();
        if (atual == null) {
            atual = configuracaoSistemaRepo.findById(ConfiguracaoSistema.ID_DEFAULT)
                    .orElseGet(ConfiguracaoSistema::new);
            cache.set(atual);
        }
        return atual;
    }

    // Usado por AssinaturaService (buscarPlano/iniciarCheckout) no lugar do
    // valor fixo do properties — sem autorização própria, é lido em rotas
    // públicas (ex.: preço/trial da landing page).
    public int trialDaysEfetivo() {
        Integer override = efetiva().getTrialDaysOverride();
        return override != null ? override : (int) trialDaysPadrao;
    }

    // Null/true = habilitado; só false explícito desativa (ver comentário em
    // ConfiguracaoSistema.cadastroPublicoHabilitado sobre por que isso não é
    // um boolean primitivo).
    public boolean cadastroPublicoHabilitado() {
        Boolean valor = efetiva().getCadastroPublicoHabilitado();
        return valor == null || valor;
    }

    public int rateLimitLoginMaxTentativas() {
        Integer override = efetiva().getRateLimitLoginMaxTentativas();
        return override != null ? override : RATE_LIMIT_LOGIN_PADRAO;
    }

    public int rateLimitGeralMaxTentativas() {
        Integer override = efetiva().getRateLimitGeralMaxTentativas();
        return override != null ? override : RATE_LIMIT_GERAL_PADRAO;
    }

    // Usado por NotificacaoNovoCadastroService após um novo Usuario se
    // autocadastrar — null quando a notificação está desligada ou sem
    // e-mail configurado, sinalizando pra quem chama não tentar enviar nada.
    public String notificacaoCadastroDestino() {
        ConfiguracaoSistema c = efetiva();
        if (!c.isNotificacaoCadastroHabilitado()) {
            return null;
        }
        String email = c.getNotificacaoCadastroEmail();
        return (email != null && !email.isBlank()) ? email : null;
    }

    // Subconjunto seguro de expor a qualquer usuário autenticado (não só
    // MASTER) — nunca rate limit, nunca trial days.
    public ConfiguracaoExibicaoResponseDTO exibicao() {
        ConfiguracaoSistema c = efetiva();
        return new ConfiguracaoExibicaoResponseDTO(
                c.isBannerHabilitado(), c.getBannerMensagem(),
                c.isPopupHabilitado(), c.getPopupTitulo(), c.getPopupDescricao(),
                c.getPopupBotaoTexto(), c.getPopupBotaoUrl(), c.getPopupVersao(),
                c.getContatoSuporteWhatsapp(), c.getContatoSuporteEmail());
    }

    public ConfiguracaoSistemaResponseDTO buscar(Authentication authentication) {
        exigirMaster(authentication);
        return toResponseDTO(efetiva());
    }

    public ConfiguracaoSistemaResponseDTO atualizar(AtualizarConfiguracaoDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> c.setTrialDaysOverride(dto.getTrialDays()));
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Dias de trial",
                Map.of("trialDays", dto.getTrialDays()));
        return toResponseDTO(configuracao);
    }

    public ConfiguracaoSistemaResponseDTO atualizarCadastroPublico(AtualizarCadastroPublicoDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> c.setCadastroPublicoHabilitado(dto.isHabilitado()));
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Cadastro público",
                Map.of("habilitado", dto.isHabilitado()));
        return toResponseDTO(configuracao);
    }

    public ConfiguracaoSistemaResponseDTO atualizarRateLimit(AtualizarRateLimitDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> {
            c.setRateLimitLoginMaxTentativas(dto.getLoginMaxTentativas());
            c.setRateLimitGeralMaxTentativas(dto.getGeralMaxTentativas());
        });
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Limites de rate limit",
                Map.of("loginMaxTentativas", dto.getLoginMaxTentativas(), "geralMaxTentativas", dto.getGeralMaxTentativas()));
        return toResponseDTO(configuracao);
    }

    public ConfiguracaoSistemaResponseDTO atualizarBanner(AtualizarBannerDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> {
            c.setBannerHabilitado(dto.isHabilitado());
            c.setBannerMensagem(dto.getMensagem());
        });
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Banner global",
                Map.of("habilitado", dto.isHabilitado()));
        return toResponseDTO(configuracao);
    }

    public ConfiguracaoSistemaResponseDTO atualizarContatoSuporte(AtualizarContatoSuporteDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> {
            c.setContatoSuporteWhatsapp(dto.getWhatsapp());
            c.setContatoSuporteEmail(dto.getEmail());
        });
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Contato de suporte", null);
        return toResponseDTO(configuracao);
    }

    // Incrementa popupVersao a cada save (mesmo sem mudar o conteúdo) — o
    // frontend usa esse número pra decidir se já mostrou este anúncio pro
    // usuário (ver ConfiguracaoExibicaoResponseDTO/localStorage no frontend).
    public ConfiguracaoSistemaResponseDTO atualizarPopup(AtualizarPopupDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> {
            c.setPopupHabilitado(dto.isHabilitado());
            c.setPopupTitulo(dto.getTitulo());
            c.setPopupDescricao(dto.getDescricao());
            c.setPopupBotaoTexto(dto.getBotaoTexto());
            c.setPopupBotaoUrl(dto.getBotaoUrl());
            c.setPopupVersao(c.getPopupVersao() + 1);
        });
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Popup de novidade",
                Map.of("habilitado", dto.isHabilitado(), "versao", configuracao.getPopupVersao()));
        return toResponseDTO(configuracao);
    }

    public ConfiguracaoSistemaResponseDTO atualizarNotificacaoCadastro(AtualizarNotificacaoCadastroDTO dto, Authentication authentication) {
        ConfiguracaoSistema configuracao = salvar(authentication, c -> {
            c.setNotificacaoCadastroHabilitado(dto.isHabilitado());
            c.setNotificacaoCadastroEmail(dto.getEmail());
        });
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.CONFIGURACAO_ALTERADA,
                "CONFIGURACAO", ConfiguracaoSistema.ID_DEFAULT, "Notificação de novo cadastro",
                Map.of("habilitado", dto.isHabilitado()));
        return toResponseDTO(configuracao);
    }

    private ConfiguracaoSistema salvar(Authentication authentication, java.util.function.Consumer<ConfiguracaoSistema> mutacao) {
        Usuario usuarioLogado = exigirMaster(authentication);

        ConfiguracaoSistema configuracao = configuracaoSistemaRepo.findById(ConfiguracaoSistema.ID_DEFAULT)
                .orElseGet(() -> {
                    ConfiguracaoSistema nova = new ConfiguracaoSistema();
                    nova.setId(ConfiguracaoSistema.ID_DEFAULT);
                    return nova;
                });

        mutacao.accept(configuracao);
        configuracao.setAtualizadoEm(Instant.now());
        configuracao.setAtualizadoPor(usuarioLogado.getEmail());
        configuracaoSistemaRepo.save(configuracao);
        cache.set(configuracao);

        return configuracao;
    }

    private ConfiguracaoSistemaResponseDTO toResponseDTO(ConfiguracaoSistema c) {
        return new ConfiguracaoSistemaResponseDTO(
                trialDaysEfetivo(),
                cadastroPublicoHabilitado(),
                rateLimitLoginMaxTentativas(),
                rateLimitGeralMaxTentativas(),
                c.isBannerHabilitado(), c.getBannerMensagem(),
                c.getContatoSuporteWhatsapp(), c.getContatoSuporteEmail(),
                c.isPopupHabilitado(), c.getPopupTitulo(), c.getPopupDescricao(),
                c.getPopupBotaoTexto(), c.getPopupBotaoUrl(), c.getPopupVersao(),
                c.isNotificacaoCadastroHabilitado(), c.getNotificacaoCadastroEmail());
    }

    private Usuario exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
        return usuarioLogado;
    }
}
