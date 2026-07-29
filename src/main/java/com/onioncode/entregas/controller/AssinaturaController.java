package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.dto.AssinaturaAdminResponseDTO;
import com.onioncode.entregas.dto.AssinaturaResponseDTO;
import com.onioncode.entregas.dto.CheckoutSessionResponseDTO;
import com.onioncode.entregas.dto.ConcederManualDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.PlanoResponseDTO;
import com.onioncode.entregas.dto.PortalSessionResponseDTO;
import com.onioncode.entregas.dto.RevogarManualDTO;
import com.onioncode.entregas.service.AssinaturaService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assinaturas")
public class AssinaturaController {

    private final AssinaturaService assinaturaService;

    public AssinaturaController(AssinaturaService assinaturaService) {
        this.assinaturaService = assinaturaService;
    }

    // Info pública do plano (preço + duração do trial) — usada na landing page
    // e no cadastro, antes de existir qualquer sessão. Único endpoint desse
    // controller liberado no SecurityConfig sem exigir JWT.
    @GetMapping("/plano")
    public PlanoResponseDTO plano() {
        return assinaturaService.buscarPlano();
    }

    // Status atual da assinatura do usuário logado. Sempre 200 (mesmo sem
    // nenhuma Assinatura ainda) — o frontend nunca precisa tratar um caso de
    // erro especial só pra saber que o usuário está em SEM_ASSINATURA.
    @GetMapping("/me")
    public AssinaturaResponseDTO me(Authentication authentication) {
        return assinaturaService.statusAtual(authentication);
    }

    @PostMapping("/checkout-session")
    public CheckoutSessionResponseDTO checkoutSession(Authentication authentication) {
        return assinaturaService.iniciarCheckout(authentication);
    }

    @PostMapping("/portal-session")
    public PortalSessionResponseDTO portalSession(Authentication authentication) {
        return assinaturaService.iniciarPortal(authentication);
    }

    // Concessão manual (cortesia, migração de usuários legados, pagamento fora
    // da Stripe) — somente MASTER, checado dentro do service.
    @PreAuthorize("hasRole('MASTER')")
    @PostMapping("/manual")
    public void concederManual(@RequestBody @Valid ConcederManualDTO dto, Authentication authentication) {
        assinaturaService.concederManual(dto.getUsuarioId(), dto.getDiasCortesia(), authentication);
    }

    // Inverso da concessão manual — só MASTER, checado dentro do service, que
    // também garante que só cortesias (sem cobrança real no Stripe) podem
    // ser revogadas por aqui.
    @PreAuthorize("hasRole('MASTER')")
    @PostMapping("/revogar")
    public void revogarManual(@RequestBody @Valid RevogarManualDTO dto, Authentication authentication) {
        assinaturaService.revogarManual(dto.getUsuarioId(), authentication);
    }

    // Listagem admin de assinaturas (aba "Assinaturas" do Dashboard Master)
    // — somente MASTER, checado dentro do service.
    @PreAuthorize("hasRole('MASTER')")
    @GetMapping("/findAll")
    public PageResponseDTO<AssinaturaAdminResponseDTO> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) StatusAssinatura status,
            Authentication authentication) {
        return assinaturaService.findAllPaged(authentication, page, size, status);
    }
}
