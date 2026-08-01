package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.AlteracaoSenhaPendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface AlteracaoSenhaPendenteRepo extends JpaRepository<AlteracaoSenhaPendente, String> {
    Optional<AlteracaoSenhaPendente> findByUsuarioId(String usuarioId);
    void deleteByUsuarioId(String usuarioId);

    // Substitui o TTL index nativo do Mongo — ver LimpezaExpiradosJob.
    long deleteByExpiraEmBefore(Instant limite);
}
