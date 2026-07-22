package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.AssinaturaResponseDTO;
import com.onioncode.entregas.dto.CheckoutSessionResponseDTO;
import com.onioncode.entregas.dto.ConcederManualDTO;
import com.onioncode.entregas.dto.PlanoResponseDTO;
import com.onioncode.entregas.dto.PortalSessionResponseDTO;
import com.onioncode.entregas.service.AssinaturaService;
import jakarta.validation.Valid;
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
    @PostMapping("/manual")
    public void concederManual(@RequestBody @Valid ConcederManualDTO dto, Authentication authentication) {
        assinaturaService.concederManual(dto.getUsuarioId(), dto.getDiasCortesia(), authentication);
    }
}
