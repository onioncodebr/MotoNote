package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.TipoVisitaPagina;
import br.com.onioncode.motonote.domain.VisitaPagina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VisitaPaginaRepo extends JpaRepository<VisitaPagina, String> {
    long countByTipo(TipoVisitaPagina tipo);
}
