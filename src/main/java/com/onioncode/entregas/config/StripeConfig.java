package com.onioncode.entregas.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

// O SDK do Stripe é inicializado via um campo estático global (Stripe.apiKey),
// não por injeção de dependência tradicional — por isso não há um @Bean aqui,
// só o @PostConstruct que roda uma vez na subida da aplicação.
@Configuration
public class StripeConfig {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }
}
