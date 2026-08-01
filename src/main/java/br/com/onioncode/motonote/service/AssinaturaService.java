package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.Assinatura;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.StatusAssinatura;
import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.AssinaturaAdminResponseDTO;
import br.com.onioncode.motonote.dto.AssinaturaResponseDTO;
import br.com.onioncode.motonote.dto.CheckoutSessionResponseDTO;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.PlanoResponseDTO;
import br.com.onioncode.motonote.dto.PortalSessionResponseDTO;
import br.com.onioncode.motonote.exception.AcessoNegadoException;
import br.com.onioncode.motonote.exception.AssinaturaJaAtivaException;
import br.com.onioncode.motonote.exception.AssinaturaNaoEncontradaException;
import br.com.onioncode.motonote.exception.RevogacaoNaoPermitidaException;
import br.com.onioncode.motonote.repository.AssinaturaRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import br.com.onioncode.motonote.util.PaginacaoUtils;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.Price;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AssinaturaService {

    private static final Set<StatusAssinatura> STATUS_COM_ACESSO =
            Set.of(StatusAssinatura.TRIALING, StatusAssinatura.ATIVA);

    private final AssinaturaRepo assinaturaRepo;
    private final UsuarioRepo usuarioRepo;
    private final StripeGateway stripeGateway;
    private final AssinaturaAcessoCache acessoCache;
    private final AuditoriaService auditoriaService;
    private final ConfiguracaoSistemaService configuracaoSistemaService;

    @Value("${stripe.price-id}")
    private String priceId;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public AssinaturaService(AssinaturaRepo assinaturaRepo, UsuarioRepo usuarioRepo, StripeGateway stripeGateway,
                              AssinaturaAcessoCache acessoCache, AuditoriaService auditoriaService,
                              ConfiguracaoSistemaService configuracaoSistemaService) {
        this.assinaturaRepo = assinaturaRepo;
        this.usuarioRepo = usuarioRepo;
        this.stripeGateway = stripeGateway;
        this.acessoCache = acessoCache;
        this.auditoriaService = auditoriaService;
        this.configuracaoSistemaService = configuracaoSistemaService;
    }

    // Todo save que passa por aqui em vez de assinaturaRepo.save direto
    // invalida o cache de acesso pra esse usuário, garantindo que uma
    // mudança de status (webhook do Stripe, concessão manual) nunca fica
    // presa atrás do TTL do AssinaturaAcessoCache.
    private Assinatura salvar(Assinatura assinatura) {
        Assinatura salvo = assinaturaRepo.save(assinatura);
        acessoCache.invalidar(assinatura.getUsuarioId());
        return salvo;
    }

    // --- Info pública do plano (landing page / cadastro, sem autenticação) ---

    public PlanoResponseDTO buscarPlano() {
        Price price = stripeGateway.buscarPrice(priceId);
        // unitAmount vem em centavos (padrão Stripe); nunca é null pra um Price
        // de valor fixo (não teria sentido pra um Price "custom"/metered, que
        // não é o caso desse produto).
        double valorMensal = price.getUnitAmount() / 100.0;
        return new PlanoResponseDTO(valorMensal, price.getCurrency().toUpperCase(), configuracaoSistemaService.trialDaysEfetivo(),
                configuracaoSistemaService.cadastroPublicoHabilitado());
    }

    // --- Acesso (consultado pelo AssinaturaGateFilter) ---

    public boolean temAcessoLiberado(String usuarioId) {
        Boolean cacheado = acessoCache.get(usuarioId);
        if (cacheado != null) {
            return cacheado;
        }

        boolean liberado = assinaturaRepo.findByUsuarioId(usuarioId)
                .map(a -> STATUS_COM_ACESSO.contains(a.getStatus()))
                .orElse(false);
        acessoCache.put(usuarioId, liberado);
        return liberado;
    }

    // --- Cadastro (Fase 3) ---

    // Cria o documento "placeholder" no momento do signup, sem chamar a API do
    // Stripe (Customer é criado sob demanda no primeiro checkout) — mantém o
    // cadastro rápido e resiliente a instabilidade da Stripe, e garante que
    // todo usuarioId sempre tem uma Assinatura correspondente desde o dia 1.
    public void criarPlaceholder(String usuarioId) {
        Assinatura assinatura = new Assinatura();
        assinatura.setUsuarioId(usuarioId);
        assinatura.setStatus(StatusAssinatura.SEM_ASSINATURA);
        assinatura.setCriadoEm(Instant.now());
        assinatura.setAtualizadoEm(Instant.now());
        salvar(assinatura);
    }

    // --- Status atual (Fase 4: GET /api/assinaturas/me) ---

    public AssinaturaResponseDTO statusAtual(Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (usuario.getRole() == Role.MASTER) {
            return new AssinaturaResponseDTO("MASTER", null, null, true);
        }

        Optional<Assinatura> assinatura = assinaturaRepo.findByUsuarioId(usuario.getId());
        if (assinatura.isEmpty()) {
            return new AssinaturaResponseDTO(StatusAssinatura.SEM_ASSINATURA.name(), null, null, false);
        }

        Assinatura a = assinatura.get();
        return new AssinaturaResponseDTO(
                a.getStatus().name(),
                a.getTrialTerminaEm(),
                a.getPeriodoAtualTerminaEm(),
                STATUS_COM_ACESSO.contains(a.getStatus())
        );
    }

    // --- Checkout e Portal (Fase 4) ---

    public CheckoutSessionResponseDTO iniciarCheckout(Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        Assinatura assinatura = buscarOuCriarAssinatura(usuario.getId());

        if (STATUS_COM_ACESSO.contains(assinatura.getStatus())) {
            throw new AssinaturaJaAtivaException();
        }

        if (assinatura.getStripeCustomerId() == null) {
            Customer customer = stripeGateway.criarCustomer(usuario.getEmail(), usuario.getName(), usuario.getId());
            assinatura.setStripeCustomerId(customer.getId());
            assinatura.setAtualizadoEm(Instant.now());
            salvar(assinatura);
        }

        String successUrl = frontendUrl + "/?checkout=success&session_id={CHECKOUT_SESSION_ID}";
        String cancelUrl = frontendUrl + "/?checkout=cancel";

        Session session = stripeGateway.criarCheckoutSession(
                assinatura.getStripeCustomerId(), priceId, configuracaoSistemaService.trialDaysEfetivo(), successUrl, cancelUrl, usuario.getId());

        return new CheckoutSessionResponseDTO(session.getUrl());
    }

    public PortalSessionResponseDTO iniciarPortal(Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        Assinatura assinatura = assinaturaRepo.findByUsuarioId(usuario.getId())
                .orElseThrow(AssinaturaNaoEncontradaException::new);

        if (assinatura.getStripeCustomerId() == null) {
            throw new AssinaturaNaoEncontradaException();
        }

        String returnUrl = frontendUrl + "/?portal=return";
        com.stripe.model.billingportal.Session portalSession =
                stripeGateway.criarPortalSession(assinatura.getStripeCustomerId(), returnUrl);

        return new PortalSessionResponseDTO(portalSession.getUrl());
    }

    private Assinatura buscarOuCriarAssinatura(String usuarioId) {
        return assinaturaRepo.findByUsuarioId(usuarioId)
                .orElseGet(() -> {
                    Assinatura nova = new Assinatura();
                    nova.setUsuarioId(usuarioId);
                    nova.setStatus(StatusAssinatura.SEM_ASSINATURA);
                    nova.setCriadoEm(Instant.now());
                    nova.setAtualizadoEm(Instant.now());
                    return salvar(nova);
                });
    }

    // --- Webhook (Fase 5) ---

    public void tratarCheckoutCompletado(Session session) {
        String usuarioId = session.getMetadata() != null ? session.getMetadata().get("usuarioId") : null;
        Optional<Assinatura> porCustomer = assinaturaRepo.findByStripeCustomerId(session.getCustomer());
        Optional<Assinatura> alvo = porCustomer.isPresent()
                ? porCustomer
                : (usuarioId != null ? assinaturaRepo.findByUsuarioId(usuarioId) : Optional.empty());

        alvo.ifPresent(a -> {
            a.setStripeCustomerId(session.getCustomer());
            a.setStripeSubscriptionId(session.getSubscription());
            if (session.getSubscription() != null) {
                Subscription subscription = stripeGateway.buscarSubscription(session.getSubscription());
                aplicarDadosDaSubscription(a, subscription);
            }
            a.setAtualizadoEm(Instant.now());
            salvar(a);
        });
    }

    public void tratarSubscriptionAtualizada(Subscription subscription) {
        assinaturaRepo.findByStripeSubscriptionId(subscription.getId()).ifPresent(a -> {
            aplicarDadosDaSubscription(a, subscription);
            a.setAtualizadoEm(Instant.now());
            salvar(a);
        });
    }

    public void tratarSubscriptionCancelada(Subscription subscription) {
        assinaturaRepo.findByStripeSubscriptionId(subscription.getId()).ifPresent(a -> {
            a.setStatus(StatusAssinatura.CANCELADA);
            a.setAtualizadoEm(Instant.now());
            salvar(a);
        });
    }

    public void tratarPagamentoFalhou(Invoice invoice) {
        String subscriptionId = extrairSubscriptionId(invoice);
        if (subscriptionId == null) return;
        assinaturaRepo.findByStripeSubscriptionId(subscriptionId).ifPresent(a -> {
            a.setStatus(StatusAssinatura.INADIMPLENTE);
            a.setAtualizadoEm(Instant.now());
            salvar(a);
        });
    }

    public void tratarPagamentoConfirmado(Invoice invoice) {
        String subscriptionId = extrairSubscriptionId(invoice);
        if (subscriptionId == null) return;
        assinaturaRepo.findByStripeSubscriptionId(subscriptionId).ifPresent(a -> {
            if (a.getStatus() == StatusAssinatura.INADIMPLENTE) {
                a.setStatus(StatusAssinatura.ATIVA);
                a.setAtualizadoEm(Instant.now());
                salvar(a);
            }
        });
    }

    // current_period_end saiu direto da Subscription, e o vínculo Invoice→
    // Subscription seguiu o mesmo tipo de reestruturação: não é mais
    // invoice.getSubscription(), e sim invoice.getParent().getSubscriptionDetails().getSubscription().
    // Invoices avulsas (fora do contexto de uma assinatura) não têm esse "parent", daí os null-checks.
    private String extrairSubscriptionId(Invoice invoice) {
        if (invoice.getParent() == null || invoice.getParent().getSubscriptionDetails() == null) {
            return null;
        }
        return invoice.getParent().getSubscriptionDetails().getSubscription();
    }

    // Evento cru repassado pelo controller quando não é nenhum dos tipos tratados
    // explicitamente — no-op de propósito (handlers são idempotentes e só reagem
    // ao que conhecem; eventos não mapeados são ignorados sem erro).
    public void ignorarEvento(Event event) {
        // intencionalmente vazio
    }

    private void aplicarDadosDaSubscription(Assinatura assinatura, Subscription subscription) {
        assinatura.setStripeSubscriptionId(subscription.getId());
        assinatura.setStatus(mapearStatus(subscription.getStatus()));
        if (subscription.getTrialEnd() != null) {
            assinatura.setTrialTerminaEm(Instant.ofEpochSecond(subscription.getTrialEnd()));
        }
        Long currentPeriodEnd = extrairCurrentPeriodEnd(subscription);
        if (currentPeriodEnd != null) {
            assinatura.setPeriodoAtualTerminaEm(Instant.ofEpochSecond(currentPeriodEnd));
        }
    }

    // A partir de determinadas versões da API do Stripe, current_period_end
    // deixou de existir direto na Subscription e passou a viver em cada item
    // (subscription.items.data[].current_period_end) — lemos do primeiro item,
    // que é sempre o único nesse produto (um único Price por assinatura).
    private Long extrairCurrentPeriodEnd(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return null;
        }
        return subscription.getItems().getData().get(0).getCurrentPeriodEnd();
    }

    private StatusAssinatura mapearStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "trialing" -> StatusAssinatura.TRIALING;
            case "active" -> StatusAssinatura.ATIVA;
            case "past_due", "unpaid" -> StatusAssinatura.INADIMPLENTE;
            case "canceled", "incomplete_expired" -> StatusAssinatura.CANCELADA;
            case "incomplete" -> StatusAssinatura.INCOMPLETA;
            default -> StatusAssinatura.INCOMPLETA;
        };
    }

    // --- Concessão manual (Fase 7, MASTER-only) ---

    public void concederManual(String usuarioId, int diasCortesia, Authentication authentication) {
        exigirMaster(authentication);

        Assinatura assinatura = assinaturaRepo.findByUsuarioId(usuarioId)
                .orElseGet(() -> {
                    Assinatura nova = new Assinatura();
                    nova.setUsuarioId(usuarioId);
                    nova.setCriadoEm(Instant.now());
                    return nova;
                });

        assinatura.setStatus(StatusAssinatura.TRIALING);
        assinatura.setTrialTerminaEm(Instant.now().plus(diasCortesia, java.time.temporal.ChronoUnit.DAYS));
        assinatura.setAtualizadoEm(Instant.now());
        salvar(assinatura);

        auditoriaService.registrar(authentication, TipoAcaoAuditoria.ASSINATURA_CONCEDIDA_MANUAL,
                "ASSINATURA", usuarioId, usuarioId, Map.of("diasCortesia", diasCortesia));
    }

    // --- Revogação manual (MASTER-only) ---

    // Inverso de concederManual: só desfaz cortesias concedidas por aqui.
    // Uma assinatura com stripeSubscriptionId é cobrança real — revogar o
    // acesso local sem cancelar a cobrança no Stripe deixaria cliente sendo
    // cobrado sem acesso (ou vice-versa, dependendo de quando o webhook
    // rodar). Pra essas, o cancelamento correto é pelo portal do Stripe
    // (ver iniciarPortal), não por aqui.
    public void revogarManual(String usuarioId, Authentication authentication) {
        exigirMaster(authentication);

        Assinatura assinatura = assinaturaRepo.findByUsuarioId(usuarioId)
                .orElseThrow(AssinaturaNaoEncontradaException::new);

        if (assinatura.getStripeSubscriptionId() != null) {
            throw new RevogacaoNaoPermitidaException();
        }

        assinatura.setStatus(StatusAssinatura.SEM_ASSINATURA);
        assinatura.setTrialTerminaEm(null);
        assinatura.setPeriodoAtualTerminaEm(null);
        assinatura.setAtualizadoEm(Instant.now());
        salvar(assinatura);

        auditoriaService.registrar(authentication, TipoAcaoAuditoria.ASSINATURA_REVOGADA,
                "ASSINATURA", usuarioId, usuarioId, null);
    }

    // --- Listagem admin (MASTER-only), usada pela aba "Assinaturas" do
    // Dashboard Master. Pagina sobre Usuario (excluindo o próprio MASTER,
    // que não é assinante) e faz o join com Assinatura em lote pra evitar
    // N+1 — mesma técnica de UsuarioService.resolverUsuarioIdsPorStatus pro
    // caso especial de SEM_ASSINATURA (conta sem nenhum documento).
    public PageResponseDTO<AssinaturaAdminResponseDTO> findAllPaged(
            Authentication authentication, int page, int size, StatusAssinatura status) {
        exigirMaster(authentication);

        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Usuario> resultado;
        if (status == null) {
            resultado = usuarioRepo.findByRoleNot(Role.MASTER, pageable);
        } else {
            List<String> usuarioIds = resolverUsuarioIdsPorStatus(status);
            resultado = usuarioIds.isEmpty() ? Page.empty(pageable) : usuarioRepo.findByIdIn(usuarioIds, pageable);
        }

        List<String> idsDaPagina = resultado.getContent().stream().map(Usuario::getId).toList();
        Map<String, Assinatura> assinaturaPorUsuarioId = assinaturaRepo.findByUsuarioIdIn(idsDaPagina).stream()
                .collect(Collectors.toMap(Assinatura::getUsuarioId, a -> a, (a, b) -> a, HashMap::new));

        return PageResponseDTO.from(resultado.map(usuario -> toAdminDTO(usuario, assinaturaPorUsuarioId.get(usuario.getId()))));
    }

    // Mesma lógica de borda de UsuarioService.resolverUsuarioIdsPorStatus:
    // contas criadas manualmente pelo MASTER nunca ganham um placeholder de
    // Assinatura, então SEM_ASSINATURA precisa enxergar tanto quem tem um
    // documento explícito com esse status quanto quem não tem documento
    // nenhum (excluindo sempre o próprio MASTER).
    private List<String> resolverUsuarioIdsPorStatus(StatusAssinatura status) {
        List<String> comDocumentoDesseStatus = assinaturaRepo.findByStatus(status).stream()
                .map(Assinatura::getUsuarioId)
                .toList();

        if (status != StatusAssinatura.SEM_ASSINATURA) {
            return comDocumentoDesseStatus;
        }

        Set<String> usuarioIdsComAlgumDocumento = assinaturaRepo.findAll().stream()
                .map(Assinatura::getUsuarioId)
                .collect(Collectors.toSet());
        List<String> semDocumentoAlgum = usuarioRepo.findAll().stream()
                .filter(u -> u.getRole() != Role.MASTER)
                .map(Usuario::getId)
                .filter(id -> !usuarioIdsComAlgumDocumento.contains(id))
                .toList();

        return java.util.stream.Stream.concat(comDocumentoDesseStatus.stream(), semDocumentoAlgum.stream()).toList();
    }

    private AssinaturaAdminResponseDTO toAdminDTO(Usuario usuario, Assinatura assinatura) {
        StatusAssinatura status = assinatura != null ? assinatura.getStatus() : StatusAssinatura.SEM_ASSINATURA;
        return new AssinaturaAdminResponseDTO(
                usuario.getId(),
                usuario.getName(),
                usuario.getEmail(),
                status,
                assinatura != null ? assinatura.getTrialTerminaEm() : null,
                assinatura != null ? assinatura.getPeriodoAtualTerminaEm() : null,
                assinatura != null ? assinatura.getCriadoEm() : null);
    }

    private void exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
    }
}
