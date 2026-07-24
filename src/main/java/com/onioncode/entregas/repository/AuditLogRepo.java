package com.onioncode.entregas.repository;

import com.onioncode.entregas.domain.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

// Sem métodos próprios: a listagem paginada (mais recentes primeiro) usa o
// findAll(Pageable) herdado de MongoRepository, igual ao padrão de
// AssinaturaRepo/UsuarioRepo para listas que não precisam de filtro.
@Repository
public interface AuditLogRepo extends MongoRepository<AuditLog, String> {
}
