package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.EntregaResponseDTO;
import com.onioncode.entregas.dto.GastoRequestDTO;
import com.onioncode.entregas.dto.GastoResponseDTO;
import com.onioncode.entregas.dto.MotoboyResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoFaturamentoDTO;
import com.onioncode.entregas.dto.ResumoValorDTO;
import com.onioncode.entregas.dto.ValeResponseDTO;
import com.onioncode.entregas.service.EntregaService;
import com.onioncode.entregas.service.GastoService;
import com.onioncode.entregas.service.MotoboyService;
import com.onioncode.entregas.service.ValeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

// Portal restrito do motoboy: só leitura, e sempre escopado ao próprio
// motoboy autenticado (nunca a um id vindo do request) — ver
// MotoboyAccessGateFilter, que é o que garante que só essas rotas (fora
// /api/auth/**) são alcançáveis por um token de Motoboy.
@RestController
@RequestMapping("/api/motoboy/me")
public class MotoboyPortalController {

    private final EntregaService entregaService;
    private final MotoboyService motoboyService;
    private final GastoService gastoService;
    private final ValeService valeService;

    public MotoboyPortalController(EntregaService entregaService, MotoboyService motoboyService,
                                    GastoService gastoService, ValeService valeService) {
        this.entregaService = entregaService;
        this.motoboyService = motoboyService;
        this.gastoService = gastoService;
        this.valeService = valeService;
    }

    @GetMapping
    public ResponseEntity<MotoboyResponseDTO> me(Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(motoboyService.motoboyToResponse(motoboy));
    }

    @GetMapping("/entregas")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> entregas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findAllByMotoboySelfPaged(motoboy.getId(), page, size));
    }

    @GetMapping("/relatorio")
    public ResponseEntity<List<EntregaResponseDTO>> relatorio(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findByMotoboyAndDateRangeSelf(motoboy.getId(), startDate, endDate));
    }

    // Versão paginada do mesmo relatório, usada pela tabela na tela — o
    // endpoint de cima (sem paginação) continua servindo o export.
    @GetMapping("/relatorio/pagina")
    public ResponseEntity<PageResponseDTO<EntregaResponseDTO>> relatorioPaginado(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.findByMotoboyAndDateRangeSelfPaged(motoboy.getId(), startDate, endDate, page, size));
    }

    @GetMapping("/resumo")
    public ResponseEntity<ResumoFaturamentoDTO> resumo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(entregaService.getResumoFaturamentoMotoboySelf(motoboy.getId(), startDate, endDate));
    }

    @PutMapping("/senha")
    public ResponseEntity<Void> alterarSenha(@RequestBody @Valid AlterarSenhaDTO dto, Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        motoboyService.alterarSenhaSelf(dto, motoboy);
        return ResponseEntity.noContent().build();
    }

    // --- Gastos (pneu, gasolina, óleo etc.) — só o próprio motoboy pode
    // criar/editar/excluir os seus; o dono da conta só visualiza (ver
    // GastoController, sem nenhum endpoint de escrita). ---

    @GetMapping("/gastos")
    public ResponseEntity<PageResponseDTO<GastoResponseDTO>> gastos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(gastoService.findAllByMotoboySelfPaged(motoboy.getId(), page, size));
    }

    @PostMapping("/gastos")
    public ResponseEntity<GastoResponseDTO> criarGasto(@RequestBody @Valid GastoRequestDTO dto, Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(gastoService.create(dto, motoboy));
    }

    @PutMapping("/gastos/{id}")
    public ResponseEntity<GastoResponseDTO> editarGasto(
            @PathVariable String id,
            @RequestBody @Valid GastoRequestDTO dto,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(gastoService.update(id, dto, motoboy));
    }

    @DeleteMapping("/gastos/{id}")
    public ResponseEntity<Void> excluirGasto(@PathVariable String id, Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        gastoService.delete(id, motoboy);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/gastos/{id}/comprovante")
    public ResponseEntity<GastoResponseDTO> anexarComprovante(
            @PathVariable String id,
            @RequestParam("comprovante") MultipartFile comprovante,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(gastoService.anexarComprovante(id, comprovante, motoboy));
    }

    @DeleteMapping("/gastos/{id}/comprovante")
    public ResponseEntity<GastoResponseDTO> removerComprovante(@PathVariable String id, Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(gastoService.removerComprovante(id, motoboy));
    }

    @GetMapping("/gastos/resumo")
    public ResponseEntity<ResumoValorDTO> resumoGastos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(gastoService.getResumoMotoboySelf(motoboy.getId(), startDate, endDate));
    }

    // --- Vales (adiantamento/desconto) — só leitura: quem cria/edita/exclui
    // é sempre o dono da conta (ver ValeController). ---

    @GetMapping("/vales")
    public ResponseEntity<PageResponseDTO<ValeResponseDTO>> vales(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(valeService.findAllByMotoboySelfPaged(motoboy.getId(), page, size));
    }

    @GetMapping("/vales/resumo")
    public ResponseEntity<ResumoValorDTO> resumoVales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Motoboy motoboy = (Motoboy) authentication.getPrincipal();
        return ResponseEntity.ok(valeService.getResumoMotoboySelf(motoboy.getId(), startDate, endDate));
    }
}
