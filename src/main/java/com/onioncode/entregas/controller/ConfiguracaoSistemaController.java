package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.AtualizarBannerDTO;
import com.onioncode.entregas.dto.AtualizarCadastroPublicoDTO;
import com.onioncode.entregas.dto.AtualizarConfiguracaoDTO;
import com.onioncode.entregas.dto.AtualizarContatoSuporteDTO;
import com.onioncode.entregas.dto.AtualizarPopupDTO;
import com.onioncode.entregas.dto.AtualizarRateLimitDTO;
import com.onioncode.entregas.dto.ConfiguracaoSistemaResponseDTO;
import com.onioncode.entregas.service.ConfiguracaoSistemaService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master/configuracoes")
public class ConfiguracaoSistemaController {

    private final ConfiguracaoSistemaService configuracaoSistemaService;

    public ConfiguracaoSistemaController(ConfiguracaoSistemaService configuracaoSistemaService) {
        this.configuracaoSistemaService = configuracaoSistemaService;
    }

    @GetMapping
    public ConfiguracaoSistemaResponseDTO buscar(Authentication authentication) {
        return configuracaoSistemaService.buscar(authentication);
    }

    @PutMapping
    public ConfiguracaoSistemaResponseDTO atualizar(@RequestBody @Valid AtualizarConfiguracaoDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizar(dto, authentication);
    }

    @PutMapping("/cadastro-publico")
    public ConfiguracaoSistemaResponseDTO atualizarCadastroPublico(@RequestBody @Valid AtualizarCadastroPublicoDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarCadastroPublico(dto, authentication);
    }

    @PutMapping("/rate-limit")
    public ConfiguracaoSistemaResponseDTO atualizarRateLimit(@RequestBody @Valid AtualizarRateLimitDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarRateLimit(dto, authentication);
    }

    @PutMapping("/banner")
    public ConfiguracaoSistemaResponseDTO atualizarBanner(@RequestBody @Valid AtualizarBannerDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarBanner(dto, authentication);
    }

    @PutMapping("/contato-suporte")
    public ConfiguracaoSistemaResponseDTO atualizarContatoSuporte(@RequestBody @Valid AtualizarContatoSuporteDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarContatoSuporte(dto, authentication);
    }

    @PutMapping("/popup")
    public ConfiguracaoSistemaResponseDTO atualizarPopup(@RequestBody @Valid AtualizarPopupDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarPopup(dto, authentication);
    }
}
