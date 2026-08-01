package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.dto.AtualizarBannerDTO;
import br.com.onioncode.motonote.dto.AtualizarCadastroPublicoDTO;
import br.com.onioncode.motonote.dto.AtualizarConfiguracaoDTO;
import br.com.onioncode.motonote.dto.AtualizarContatoSuporteDTO;
import br.com.onioncode.motonote.dto.AtualizarNotificacaoCadastroDTO;
import br.com.onioncode.motonote.dto.AtualizarPopupDTO;
import br.com.onioncode.motonote.dto.AtualizarRateLimitDTO;
import br.com.onioncode.motonote.dto.ConfiguracaoSistemaResponseDTO;
import br.com.onioncode.motonote.service.ConfiguracaoSistemaService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master/configuracoes")
// Todos os endpoints deste controller são MASTER-only — anotação na
// classe em vez de repetir em cada método (ver melhorias.md 1.1).
@PreAuthorize("hasRole('MASTER')")
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

    @PutMapping("/notificacao-cadastro")
    public ConfiguracaoSistemaResponseDTO atualizarNotificacaoCadastro(@RequestBody @Valid AtualizarNotificacaoCadastroDTO dto, Authentication authentication) {
        return configuracaoSistemaService.atualizarNotificacaoCadastro(dto, authentication);
    }
}
