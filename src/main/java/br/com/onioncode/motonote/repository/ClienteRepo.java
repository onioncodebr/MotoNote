package br.com.onioncode.motonote.repository;

import br.com.onioncode.motonote.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClienteRepo extends JpaRepository<Cliente, String> {

    // Lista completa do tenant — usada pra resolver nome no frontend
    // (autocomplete/coluna "Cliente" da tabela de Entregas) e como base do
    // ranking quando não há filtro de busca. A paginação/ordenação do
    // ranking acontece em memória em ClienteService (depende de campos
    // calculados que não existem neste registro), não aqui.
    List<Cliente> findByUsuarioId(String usuarioId);

    // Busca por nome OU telefone — usada tanto no autocomplete do formulário
    // de Entrega quanto no filtro da tela de Clientes. ILIKE é
    // case-insensitive nativo do Postgres, equivalente ao $regex com
    // $options:'i' que existia no Mongo, mas sem interpretar regex — o termo
    // vai direto, sem nenhum escaping (ver ClienteService.buscarClientesDoTenant).
    @Query("SELECT c FROM Cliente c WHERE (c.nome ILIKE CONCAT('%', :termo, '%') OR c.telefone ILIKE CONCAT('%', :termo, '%')) AND c.usuarioId = :usuarioId")
    List<Cliente> findByNomeOuTelefoneContainingAndUsuarioId(@Param("termo") String termo, @Param("usuarioId") String usuarioId);

    Optional<Cliente> findByIdAndUsuarioId(String id, String usuarioId);
}
