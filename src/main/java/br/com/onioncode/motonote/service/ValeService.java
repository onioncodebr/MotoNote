package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.Motoboy;
import br.com.onioncode.motonote.domain.StatusVale;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.domain.Vale;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.ParcelaItemDTO;
import br.com.onioncode.motonote.dto.ResumoValorDTO;
import br.com.onioncode.motonote.dto.ValeParceladoRequestDTO;
import br.com.onioncode.motonote.dto.ValeRequestDTO;
import br.com.onioncode.motonote.dto.ValeResponseDTO;
import br.com.onioncode.motonote.exception.AcessoNegadoException;
import br.com.onioncode.motonote.exception.IntervaloDataInvalidoException;
import br.com.onioncode.motonote.exception.MotoboyNotFoundException;
import br.com.onioncode.motonote.exception.ValeNotFoundException;
import br.com.onioncode.motonote.repository.MotoboyRepo;
import br.com.onioncode.motonote.repository.ValeRepo;
import br.com.onioncode.motonote.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Vales (adiantamento/desconto): só o dono da conta cria/edita/exclui (ver
// ValeController); o motoboy só visualiza os seus, sem nenhum endpoint de
// escrita (ver MotoboyPortalController).
@Service
public class ValeService {

    private static final long MAX_DIAS_INTERVALO = 366;

    private final ValeRepo valeRepo;
    private final MotoboyRepo motoboyRepo;

    public ValeService(ValeRepo valeRepo, MotoboyRepo motoboyRepo) {
        this.valeRepo = valeRepo;
        this.motoboyRepo = motoboyRepo;
    }

    // --- Dono da conta (CRUD completo) ---

    public ValeResponseDTO create(ValeRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        motoboyRepo.findByIdAndUsuarioId(dto.getMotoboyId(), user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        Vale vale = new Vale();
        vale.setMotoboyId(dto.getMotoboyId());
        vale.setDescricao(dto.getDescricao());
        vale.setValue(dto.getValue());
        vale.setStatus(StatusVale.PENDENTE);
        vale.setLocalDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        valeRepo.save(vale);
        return valeToResponse(vale);
    }

    // Cria N vales independentes (um por parcela), amarrados só visualmente
    // por um grupoParcelamento comum — cada parcela pode depois ser editada,
    // excluída ou concluída sem afetar as outras (mesmos endpoints de
    // sempre, ver update/updateStatus/delete). Valor e data de cada parcela
    // vêm digitados manualmente, sem divisão automática do total.
    public List<ValeResponseDTO> createParcelado(ValeParceladoRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        motoboyRepo.findByIdAndUsuarioId(dto.getMotoboyId(), user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        String grupoParcelamento = UUID.randomUUID().toString();
        int totalParcelas = dto.getParcelas().size();

        List<Vale> vales = new ArrayList<>();
        for (int i = 0; i < totalParcelas; i++) {
            ParcelaItemDTO item = dto.getParcelas().get(i);
            Vale vale = new Vale();
            vale.setMotoboyId(dto.getMotoboyId());
            vale.setDescricao(dto.getDescricao());
            vale.setValue(item.getValue());
            vale.setStatus(StatusVale.PENDENTE);
            vale.setLocalDate(item.getDate());
            vale.setGrupoParcelamento(grupoParcelamento);
            vale.setNumeroParcela(i + 1);
            vale.setTotalParcelas(totalParcelas);
            vales.add(vale);
        }
        valeRepo.saveAll(vales);
        return vales.stream().map(this::valeToResponse).toList();
    }

    public ValeResponseDTO update(String valeId, ValeRequestDTO dto, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        Vale vale = valeRepo.findById(valeId).orElseThrow(ValeNotFoundException::new);
        motoboyRepo.findByIdAndUsuarioId(vale.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        // Permite reatribuir o vale a outro motoboy do mesmo dono.
        motoboyRepo.findByIdAndUsuarioId(dto.getMotoboyId(), user.getId())
                .orElseThrow(MotoboyNotFoundException::new);

        vale.setMotoboyId(dto.getMotoboyId());
        vale.setDescricao(dto.getDescricao());
        vale.setValue(dto.getValue());
        vale.setLocalDate(dto.getDate() != null ? dto.getDate() : vale.getLocalDate());
        valeRepo.save(vale);
        return valeToResponse(vale);
    }

    public ValeResponseDTO updateStatus(String valeId, StatusVale novoStatus, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        Vale vale = valeRepo.findById(valeId).orElseThrow(ValeNotFoundException::new);
        motoboyRepo.findByIdAndUsuarioId(vale.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        vale.setStatus(novoStatus);
        valeRepo.save(vale);
        return valeToResponse(vale);
    }

    public void delete(String valeId, Authentication authentication) {
        Usuario user = (Usuario) authentication.getPrincipal();
        Vale vale = valeRepo.findById(valeId).orElseThrow(ValeNotFoundException::new);
        motoboyRepo.findByIdAndUsuarioId(vale.getMotoboyId(), user.getId())
                .orElseThrow(AcessoNegadoException::new);

        valeRepo.deleteById(vale.getId());
    }

    public PageResponseDTO<ValeResponseDTO> findAllByUserPaged(LocalDate startDate, LocalDate endDate, String motoboyId, StatusVale status, Authentication auth, int page, int size) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();
        Pageable pageable = pageableDescPorData(page, size);

        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            Page<Vale> resultado = status != null
                    ? valeRepo.findByMotoboyIdAndStatusAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                            motoboyId, status, startDate, endDate.plusDays(1), pageable)
                    : valeRepo.findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                            motoboyId, startDate, endDate.plusDays(1), pageable);
            return PageResponseDTO.from(resultado.map(this::valeToResponse));
        }

        List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                .map(Motoboy::getId)
                .toList();
        if (motoboyIds.isEmpty()) {
            return PageResponseDTO.from(Page.empty(pageable));
        }
        Page<Vale> resultado = status != null
                ? valeRepo.findByMotoboyIdInAndStatusAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                        motoboyIds, status, startDate, endDate.plusDays(1), pageable)
                : valeRepo.findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                        motoboyIds, startDate, endDate.plusDays(1), pageable);
        return PageResponseDTO.from(resultado.map(this::valeToResponse));
    }

    // Soma total dos vales no período — usado pelo card "Vales" da Visão
    // Geral (mesmo dono, mesmos filtros de motoboy/período já existentes).
    // Soma todos os vales do período independente do status: tanto o
    // pendente quanto o já concluído representam valor que saiu (ou vai
    // sair) do bolso da empresa, então ambos entram no faturamento líquido.
    public ResumoValorDTO getResumo(LocalDate startDate, LocalDate endDate, String motoboyId, Authentication auth) {
        validarIntervalo(startDate, endDate);
        Usuario user = (Usuario) auth.getPrincipal();

        List<Vale> vales;
        if (motoboyId != null && !motoboyId.isBlank()) {
            motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())
                    .orElseThrow(MotoboyNotFoundException::new);
            vales = valeRepo.findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                    motoboyId, startDate, endDate.plusDays(1));
        } else {
            List<String> motoboyIds = motoboyRepo.findByUsuarioId(user.getId()).stream()
                    .map(Motoboy::getId)
                    .toList();
            vales = motoboyIds.isEmpty()
                    ? List.of()
                    : valeRepo.findByMotoboyIdInAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                            motoboyIds, startDate, endDate.plusDays(1));
        }

        Double total = vales.stream().mapToDouble(Vale::getValue).sum();
        return new ResumoValorDTO(vales.size(), total);
    }

    // --- Portal do motoboy (self-service, só leitura) ---

    public PageResponseDTO<ValeResponseDTO> findAllByMotoboySelfPaged(String motoboyId, int page, int size) {
        Page<Vale> resultado = valeRepo.findByMotoboyId(motoboyId, pageableDescPorData(page, size));
        return PageResponseDTO.from(resultado.map(this::valeToResponse));
    }

    // Soma total dos próprios vales no período — usado pelo card "Vales" na
    // Visão Geral do portal do motoboy. O id vem sempre do principal
    // Motoboy autenticado (nunca de um parâmetro do request), então não
    // precisa checar dono como em getResumo (visão do dono).
    public ResumoValorDTO getResumoMotoboySelf(String motoboyId, LocalDate startDate, LocalDate endDate) {
        validarIntervalo(startDate, endDate);
        List<Vale> vales = valeRepo.findByMotoboyIdAndLocalDateGreaterThanEqualAndLocalDateLessThan(
                motoboyId, startDate, endDate.plusDays(1));
        Double total = vales.stream().mapToDouble(Vale::getValue).sum();
        return new ResumoValorDTO(vales.size(), total);
    }

    // --- Utilitários ---

    private Pageable pageableDescPorData(int page, int size) {
        return PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "localDate"));
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

    private ValeResponseDTO valeToResponse(Vale vale) {
        return new ValeResponseDTO(
                vale.getId(),
                vale.getMotoboyId(),
                vale.getDescricao(),
                vale.getValue(),
                vale.getStatus(),
                vale.getLocalDate(),
                vale.getGrupoParcelamento(),
                vale.getNumeroParcela(),
                vale.getTotalParcelas()
        );
    }
}
