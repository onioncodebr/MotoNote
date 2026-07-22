package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.Assinatura;
import com.onioncode.entregas.domain.StatusAssinatura;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssinaturaRepo extends MongoRepository<Assinatura, String> {
    Optional<Assinatura> findByUsuarioId(String usuarioId);
    Optional<Assinatura> findByStripeCustomerId(String stripeCustomerId);
    Optional<Assinatura> findByStripeSubscriptionId(String stripeSubscriptionId);

    // Usado pra filtrar a listagem de Usuários (MASTER) por status de
    // assinatura — o status não fica no próprio Usuario, então filtramos
    // aqui primeiro e resolvemos os usuarioIds correspondentes.
    List<Assinatura> findByStatus(StatusAssinatura status);
}
