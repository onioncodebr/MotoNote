package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.ClienteRankingResponseDTO;
import com.onioncode.entregas.dto.ClienteRequestDTO;
import com.onioncode.entregas.dto.ClienteResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.service.ClienteService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @PostMapping
    public ResponseEntity<ClienteResponseDTO> create(@RequestBody @Valid ClienteRequestDTO dto, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.save(dto, auth));
    }

    // Lista completa do tenant — pro autocomplete/resolução de nome no
    // frontend (mesmo papel de GET /api/motoboys sem paginação).
    @GetMapping
    public ResponseEntity<List<ClienteResponseDTO>> findAll(Authentication auth) {
        return ResponseEntity.ok(clienteService.findAll(auth));
    }

    // Busca leve por nome, resultados limitados — autocomplete no
    // formulário de Entrega.
    @GetMapping("/buscar")
    public ResponseEntity<List<ClienteResponseDTO>> buscar(
            @RequestParam(required = false) String nome, Authentication auth) {
        return ResponseEntity.ok(clienteService.buscar(nome, auth));
    }

    // Ranking/listagem paginada da tela de gestão de Clientes.
    @GetMapping("/pagina")
    public ResponseEntity<PageResponseDTO<ClienteRankingResponseDTO>> ranking(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String ordenar,
            @RequestParam(defaultValue = "asc") String direcao,
            @RequestParam(defaultValue = "false") boolean somenteSemPedidos,
            Authentication auth) {
        return ResponseEntity.ok(clienteService.buscarRankingPaginado(
                auth, page, size, nome, startDate, endDate, ordenar, direcao, somenteSemPedidos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> findById(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(clienteService.findById(id, auth));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> update(
            @PathVariable String id, @RequestBody @Valid ClienteRequestDTO dto, Authentication auth) {
        return ResponseEntity.ok(clienteService.update(id, dto, auth));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        clienteService.delete(id, auth);
        return ResponseEntity.noContent().build();
    }
}
