package com.onioncode.entregas.service;

import com.onioncode.entregas.exception.PagamentoIndisponivelException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Price;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Service;

// Encapsula todas as chamadas cruas ao SDK do Stripe (que expõe métodos
// estáticos), para o AssinaturaService não conversar direto com o SDK e para
// centralizar a tradução de StripeException em algo que o
// GlobalExceptionHandler já sabe tratar.
@Service
public class StripeGateway {

    public Customer criarCustomer(String email, String name, String usuarioId) {
        try {
            CustomerCreateParams params = CustomerCreateParams.builder()
                    .setEmail(email)
                    .setName(name)
                    .putMetadata("usuarioId", usuarioId)
                    .build();
            return Customer.create(params);
        } catch (StripeException e) {
            throw new PagamentoIndisponivelException(e.getMessage());
        }
    }

    public Session criarCheckoutSession(String customerId, String priceId, long trialDays,
                                         String successUrl, String cancelUrl, String usuarioId) {
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomer(customerId)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(priceId)
                            .setQuantity(1L)
                            .build())
                    .setSubscriptionData(SessionCreateParams.SubscriptionData.builder()
                            .setTrialPeriodDays(trialDays)
                            .build())
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .putMetadata("usuarioId", usuarioId)
                    .build();
            return Session.create(params);
        } catch (StripeException e) {
            throw new PagamentoIndisponivelException(e.getMessage());
        }
    }

    public com.stripe.model.billingportal.Session criarPortalSession(String customerId, String returnUrl) {
        try {
            com.stripe.param.billingportal.SessionCreateParams params =
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                            .setCustomer(customerId)
                            .setReturnUrl(returnUrl)
                            .build();
            return com.stripe.model.billingportal.Session.create(params);
        } catch (StripeException e) {
            throw new PagamentoIndisponivelException(e.getMessage());
        }
    }

    public Price buscarPrice(String priceId) {
        try {
            return Price.retrieve(priceId);
        } catch (StripeException e) {
            throw new PagamentoIndisponivelException(e.getMessage());
        }
    }

    public Subscription buscarSubscription(String subscriptionId) {
        try {
            return Subscription.retrieve(subscriptionId);
        } catch (StripeException e) {
            throw new PagamentoIndisponivelException(e.getMessage());
        }
    }

    // Não envolve em PagamentoIndisponivelException de propósito: uma assinatura
    // de webhook inválida é um erro de requisição (400), não uma indisponibilidade
    // do Stripe — o controller de webhook trata SignatureVerificationException
    // separadamente.
    public Event validarEventoWebhook(String payload, String sigHeader, String webhookSecret)
            throws SignatureVerificationException {
        return Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
