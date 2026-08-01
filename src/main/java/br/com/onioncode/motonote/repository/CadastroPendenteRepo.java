package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.CadastroPendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface CadastroPendenteRepo extends JpaRepository<CadastroPendente, String> {
    Optional<CadastroPendente> findByEmail(String email);
    void deleteByEmail(String email);

    // Substitui o TTL index nativo do Mongo — ver LimpezaExpiradosJob.
    long deleteByExpiraEmBefore(Instant limite);
}
