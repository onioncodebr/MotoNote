package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.ConfiguracaoSistema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracaoSistemaRepo extends JpaRepository<ConfiguracaoSistema, String> {
}
