package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Gasto;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.GastoRequestDTO;
import com.onioncode.entregas.dto.GastoResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.ResumoValorDTO;
import com.onioncode.entregas.exception.ArquivoInvalidoException;
import com.onioncode.entregas.exception.GastoNotFoundException;
import com.onioncode.entregas.exception.IntervaloDataInvalidoException;
import com.onioncode.entregas.exception.MotoboyNotFoundException;
import com.onioncode.entregas.repository.GastoRepo;
import com.onioncode.entregas.repository.MotoboyRepo;
import com.onioncode.entregas.util.ImagemUtils;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;

// Gastos de moto (pneu, gasolina, óleo etc.): só o motoboy dono do gasto
// pode criar/editar/excluir os seus (ver MotoboyPortalController, sempre
// escopado ao motoboy autenticado); o dono da conta só visualiza (ver
// GastoController, sem nenhum endpoint de escrita).
@Service
public class GastoService {

    private static final long MAX_DIAS_INTERVALO = 366;

    private final GastoRepo gastoRepo;
    private final MotoboyRepo motoboyRepo;
    private final R2Gateway r2Gateway;

    public GastoService(GastoRepo gastoRepo, MotoboyRepo motoboyRepo, R2Gateway r2Gateway) {
        this.gastoRepo = gastoRepo;
        this.motoboyRepo = motoboyRepo;
        this.r2Gateway = r2Gateway;
    }

    // --- Portal do motoboy (self-service) ---

    public GastoResponseDTO create(GastoRequestDTO dto, Motoboy motoboy) {
        Gasto gasto = new Gasto();
        gasto.setMotoboyId(motoboy.getId());
        gasto.setDescricao(dto.getDescricao());
        gasto.setValue(dto.getValue());
        gasto.setLocalDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        gastoRepo.save(gasto);
        return gastoToResponse(gasto);
    }

    public GastoResponseDTO update(String gastoId, GastoRequestDTO dto, Motoboy motoboy) {
        Gasto gasto = gastoRepo.findByIdAndMotoboyId(gastoId, motoboy.getId())
                .orElseThrow(GastoNotFoundException::new);

        gasto.setDescricao(dto.getDescricao());
        gasto.setValue(dto.getValue());
        gasto.setLocalDate(dto.getDate() != null ? dto.getDate() : gasto.getLocalDate());
        gastoRepo.save(gasto);
        return gastoToResponse(gasto);
    }

    public void delete(String gastoId, Motoboy motoboy) {
        Gasto gasto = gastoRepo.findByIdAndMotoboyId(gastoId, motoboy.getId())
                .orElseThrow(GastoNotFoundException::new);
        if (gasto.getComprovanteKey() != null) {
            r2Gateway.excluirPrivado(gasto.getComprovanteKey());
        }
        gastoRepo.deleteById(gasto.getId());
    }

    // Comprovante fica no bucket PRIVADO do R2 (documento financeiro — só o
    // motoboy dono e o dono da conta, via GastoController, devem conseguir
    // abrir; ver R2Gateway.gerarUrlTemporaria). Mesma checagem de dono que
    // update/delete (findByIdAndMotoboyId).
    public GastoResponseDTO anexarComprovante(String gastoId, MultipartFile comprovante, Motoboy motoboy) {
        Gasto gasto = gastoRepo.findByIdAndMotoboyId(gastoId, motoboy.getId())
                .orElseThrow(GastoNotFoundException::new);
        ImagemUtils.validar(comprovante);

        String keyAnterior = gasto.getComprovanteKey();
        String novaKey = "comprovantes/" + motoboy.getId() + "/" + gastoId + "-" + UUID.randomUUID() + ImagemUtils.extensaoPara(comprovante);
        r2Gateway.uploadPrivado(novaKey, lerBytes(comprovante), comprovante.getContentType());
        if (keyAnterior != null) {
            r2Gateway.excluirPrivado(keyAnterior);
        }

        gasto.setComprovanteKey(novaKey);
        gastoRepo.save(gasto);
        return gastoToResponse(gasto);
    }

    public GastoResponseDTO removerComprovante(String gastoId, Motoboy motoboy) {
        Gasto gasto = gastoRepo.findByIdAndMotoboyId(gastoId, motoboy.getId())
                .orElseThrow(GastoNotFoundException::new);
        if (gasto.getComprovanteKey() != null) {
            r2Gateway.excluirPrivado(gasto.getComprovanteKey());
        }
        gasto.setComprovanteKey(null);
        gastoRepo.save(gasto);
        return gastoToResponse(gasto);
    }

    private byte[] lerBytes(MultipartFile arquivo) {
        try {
            return arquivo.getBytes();
        } catch (IOException e) {
            throw new ArquivoInvalidoException("não foi possível ler o arquivo enviado.");
        }
    }

    public PageResponseDTO<GastoResponseDTO> findAllByMotoboySelfPaged(String motoboyId, int page, int size) {
        Page<Gasto> resultado = gastoRepo.findByMotoboyId(motoboyId, pageableDescPorData(page, size));
        return PageResponseDTO.from(resultado.map(this::gastoToResponse));
    }

    // Soma total dos próprios gastos no período — usado pelo card "Gastos"
    // na Visão Geral do portal do motoboy. O id vem sempre do principal
    // Motoboy autenticado (nunca de um parâmetro do request), então não
    // precisa checar dono como em getResumo (visão do dono).
    public ResumoValorDTO getResumoMotoboySelf(String motoboyId, LocalDate startDate, LocalDate endDate) {
        validarIntervalo(startDate, endDate);
        List<Gasto> gastos = gastoRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        Double total = gastos.stream().mapToDouble(Gasto::getValue).sum();
        return new ResumoValorDTO(gastos.size(), total);
    }

    // --- Visão do dono (somente leitura) ---

    public PageResponseDTO<GastoResponseDTO> findAllByUserPaged(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth, int page, int size) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();
        Pageable pageable = pageableDescPorData(page, size);

        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            Page<Gasto> resultado = gastoRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
            return PageResponseDTO.from(resultado.map(this::gastoToResponse));
        }

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }
        Page<Gasto> resultado = gastoRepo.findByMotoboyIdInAndLocalDateBetweenUtc(
                motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)), pageable);
        return PageResponseDTO.from(resultado.map(this::gastoToResponse));
    }

    // Soma total dos gastos no período — usado pelo card "Gastos" da Visão
    // Geral (mesmo dono, mesmos filtros de motoboy/período já existentes).
    public ResumoValorDTO getResumo(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();

        List<Gasto> gastos;
        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            gastos = gastoRepo.findByMotoboyIdAndLocalDateBetweenUtc(
                    motoboyId, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        } else {
            List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                    .map(Motoboy::getId)
                    .toList();
            gastos = motoboyIds.isEmpty()
                    ? List.of()
                    : gastoRepo.findByMotoboyIdInAndLocalDateBetweenUtc(
                            motoboyIds, startOfDayUtc(startDate), startOfDayUtc(endDate.plusDays(1)));
        }

        Double total = gastos.stream().mapToDouble(Gasto::getValue).sum();
        return new ResumoValorDTO(gastos.size(), total);
    }

    // --- Utilitários ---

    private Pageable pageableDescPorData(int page, int size) {
        return PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "localDate"));
    }

    private Date startOfDayUtc(LocalDate date) {
        return Date.from(date.atStartOfDay(ZoneOffset.UTC).toInstant());
    }

    private void validarIntervalo(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IntervaloDataInvalidoException();
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > MAX_DIAS_INTERVALO) {
            throw new IntervaloDataInvalidoException(
                    "O período não pode ser maior que " + MAX_DIAS_INTERVALO + " dias.");
        }
    }

    private GastoResponseDTO gastoToResponse(Gasto gasto) {
        return new GastoResponseDTO(
                gasto.getId(),
                gasto.getMotoboyId(),
                gasto.getDescricao(),
                gasto.getValue(),
                gasto.getLocalDate(),
                r2Gateway.gerarUrlTemporaria(gasto.getComprovanteKey())
        );
    }
}
