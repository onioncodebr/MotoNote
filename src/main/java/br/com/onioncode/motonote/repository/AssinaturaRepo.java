package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Assinatura;
import br.com.onioncode.motonote.domain.StatusAssinatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssinaturaRepo extends JpaRepository<Assinatura, String> {
    Optional<Assinatura> findByUsuarioId(String usuarioId);
    Optional<Assinatura> findByStripeCustomerId(String stripeCustomerId);
    Optional<Assinatura> findByStripeSubscriptionId(String stripeSubscriptionId);

    // Usado pra filtrar a listagem de Usuários (MASTER) por status de
    // assinatura — o status não fica no próprio Usuario, então filtramos
    // aqui primeiro e resolvemos os usuarioIds correspondentes.
    List<Assinatura> findByStatus(StatusAssinatura status);

    // Contagem por status pra visão geral de métricas do MASTER — evita
    // trazer os registros inteiros só pra contar quantos existem por status.
    long countByStatus(StatusAssinatura status);

    // Join em lote pra listagem admin de assinaturas (evita N+1 query por
    // usuário — ver AssinaturaService.findAllPaged).
    List<Assinatura> findByUsuarioIdIn(List<String> usuarioIds);

    // Usado pelo job diário de aviso de trial terminando (ver
    // TrialLembreteService) — busca quem ainda está em TRIALING e cujo
    // trial cai dentro da janela "amanhã". GreaterThanEqual/LessThan pra
    // manter a janela [inicio, fim) meio-aberta — sem isso, uma
    // trialTerminaEm cravada exatamente na meia-noite de "fim" seria
    // incluída um dia adiantada.
    List<Assinatura> findByStatusAndTrialTerminaEmGreaterThanEqualAndTrialTerminaEmLessThan(
            StatusAssinatura status, Instant inicio, Instant fim);
}
