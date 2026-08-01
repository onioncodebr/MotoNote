package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

// A listagem sem filtro usa o findAll(Pageable) herdado de JpaRepository,
// igual ao padrão de AssinaturaRepo/UsuarioRepo. JpaSpecificationExecutor
// (ver AuditoriaService.findAllPaged) substitui o MongoTemplate/Criteria/
// Query que existia pra combinar até 4 filtros opcionais (ação/ator/
// período) sem explodir em métodos derivados — equivalente idiomático do
// Spring Data JPA.
@Repository
public interface AuditLogRepo extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {
}
