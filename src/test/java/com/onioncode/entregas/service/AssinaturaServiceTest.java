package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Assinatura;
import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.repository.AssinaturaRepo;
import com.onioncode.entregas.repository.UsuarioRepo;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Cobre as regras de sincronização de status de assinatura a partir dos
// webhooks do Stripe (melhorias.md 1.5) — a fonte da verdade de quem tem
// acesso liberado ao sistema. AssinaturaAcessoCache é usado de verdade (não
// mockado): é uma estrutura simples e faz parte do próprio comportamento
// testado (toda gravação de status precisa invalidar o cache na hora).
@ExtendWith(MockitoExtension.class)
class AssinaturaServiceTest {

    @Mock
    private AssinaturaRepo assinaturaRepo;
    @Mock
    private UsuarioRepo usuarioRepo;
    @Mock
    private StripeGateway stripeGateway;
    @Mock
    private AuditoriaService auditoriaService;
    @Mock
    private ConfiguracaoSistemaService configuracaoSistemaService;

    private AssinaturaService service() {
        return new AssinaturaService(assinaturaRepo, usuarioRepo, stripeGateway,
                new AssinaturaAcessoCache(), auditoriaService, configuracaoSistemaService);
    }

    private static Assinatura assinatura(StatusAssinatura status) {
        Assinatura assinatura = new Assinatura();
        assinatura.setId("assinatura-1");
        assinatura.setUsuarioId("usuario-1");
        assinatura.setStripeSubscriptionId("sub_1");
        assinatura.setStatus(status);
        return assinatura;
    }

    private static Subscription subscription(String status) {
        Subscription subscription = new Subscription();
        subscription.setId("sub_1");
        subscription.setStatus(status);
        return subscription;
    }

    private static Invoice invoiceDaSubscription(String subscriptionId) {
        Invoice.Parent.SubscriptionDetails details = new Invoice.Parent.SubscriptionDetails();
        details.setSubscription(subscriptionId);
        Invoice.Parent parent = new Invoice.Parent();
        parent.setSubscriptionDetails(details);
        Invoice invoice = new Invoice();
        invoice.setParent(parent);
        return invoice;
    }

    // --- temAcessoLiberado: quem entra é quem paga (ou está em trial) ---

    @Test
    void trialingTemAcessoLiberado() {
        when(assinaturaRepo.findByUsuarioId("usuario-1")).thenReturn(Optional.of(assinatura(StatusAssinatura.TRIALING)));

        assertThat(service().temAcessoLiberado("usuario-1")).isTrue();
    }

    @Test
    void ativaTemAcessoLiberado() {
        when(assinaturaRepo.findByUsuarioId("usuario-1")).thenReturn(Optional.of(assinatura(StatusAssinatura.ATIVA)));

        assertThat(service().temAcessoLiberado("usuario-1")).isTrue();
    }

    @Test
    void inadimplenteNaoTemAcessoLiberado() {
        when(assinaturaRepo.findByUsuarioId("usuario-1")).thenReturn(Optional.of(assinatura(StatusAssinatura.INADIMPLENTE)));

        assertThat(service().temAcessoLiberado("usuario-1")).isFalse();
    }

    @Test
    void semAssinaturaNaoTemAcessoLiberado() {
        when(assinaturaRepo.findByUsuarioId("usuario-1")).thenReturn(Optional.empty());

        assertThat(service().temAcessoLiberado("usuario-1")).isFalse();
    }

    @Test
    void resultadoDeTemAcessoLiberadoFicaEmCacheNaoConsultaRepoDeNovo() {
        when(assinaturaRepo.findByUsuarioId("usuario-1")).thenReturn(Optional.of(assinatura(StatusAssinatura.ATIVA)));
        AssinaturaService service = service();

        service.temAcessoLiberado("usuario-1");
        service.temAcessoLiberado("usuario-1");

        verify(assinaturaRepo).findByUsuarioId("usuario-1");
    }

    // --- Sincronização a partir de customer.subscription.updated ---

    @Test
    void subscriptionAtualizadaSincronizaStatusMapeado() {
        Assinatura assinatura = assinatura(StatusAssinatura.TRIALING);
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(assinatura));

        service().tratarSubscriptionAtualizada(subscription("active"));

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.ATIVA);
        verify(assinaturaRepo).save(assinatura);
    }

    @Test
    void subscriptionAtualizadaParaAssinaturaInexistenteNaoFazNada() {
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.empty());

        service().tratarSubscriptionAtualizada(subscription("active"));

        verify(assinaturaRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    // --- customer.subscription.deleted ---

    @Test
    void subscriptionCanceladaMarcaComoCancelada() {
        Assinatura assinatura = assinatura(StatusAssinatura.ATIVA);
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(assinatura));

        service().tratarSubscriptionCancelada(subscription("canceled"));

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.CANCELADA);
    }

    // --- invoice.payment_failed / invoice.payment_succeeded ---

    @Test
    void pagamentoFalhouMarcaComoInadimplente() {
        Assinatura assinatura = assinatura(StatusAssinatura.ATIVA);
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(assinatura));

        service().tratarPagamentoFalhou(invoiceDaSubscription("sub_1"));

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.INADIMPLENTE);
    }

    @Test
    void pagamentoConfirmadoReativaAssinaturaInadimplente() {
        Assinatura assinatura = assinatura(StatusAssinatura.INADIMPLENTE);
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(assinatura));

        service().tratarPagamentoConfirmado(invoiceDaSubscription("sub_1"));

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.ATIVA);
    }

    // Confirma que a confirmação de pagamento só reage a quem estava
    // INADIMPLENTE — não deveria mexer numa assinatura já ATIVA/TRIALING
    // (evita um invoice.payment_succeeded fora de ordem "reativar" algo que
    // já estava certo, mascarando um status mais recente vindo de outro
    // evento).
    @Test
    void pagamentoConfirmadoNaoAlteraAssinaturaQueNaoEstavaInadimplente() {
        Assinatura assinatura = assinatura(StatusAssinatura.ATIVA);
        when(assinaturaRepo.findByStripeSubscriptionId("sub_1")).thenReturn(Optional.of(assinatura));

        service().tratarPagamentoConfirmado(invoiceDaSubscription("sub_1"));

        verify(assinaturaRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void pagamentoFalhouSemSubscriptionAssociadaNaoFazNada() {
        Invoice invoiceAvulsa = new Invoice();
        // Sem parent (invoice fora do contexto de uma assinatura).

        service().tratarPagamentoFalhou(invoiceAvulsa);

        verify(assinaturaRepo, never()).findByStripeSubscriptionId(org.mockito.ArgumentMatchers.any());
    }
}
