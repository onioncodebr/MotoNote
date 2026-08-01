package br.com.onioncode.motonote.controller;

import br.com.onioncode.motonote.dto.ConfiguracaoExibicaoResponseDTO;
import br.com.onioncode.motonote.service.ConfiguracaoSistemaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Diferente de ConfiguracaoSistemaController (só MASTER, sob /api/master/**):
// este endpoint expõe só o subconjunto seguro de ConfiguracaoSistema
// (banner, popup, contato de suporte) pra qualquer usuário autenticado —
// é consumido pelo dashboard de todo tenant, não só pelo MASTER. Cai sob
// anyRequest().authenticated() do SecurityConfig sem precisar de nenhuma
// mudança lá.
@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoExibicaoController {

    private final ConfiguracaoSistemaService configuracaoSistemaService;

    public ConfiguracaoExibicaoController(ConfiguracaoSistemaService configuracaoSistemaService) {
        this.configuracaoSistemaService = configuracaoSistemaService;
    }

    @GetMapping("/exibicao")
    public ConfiguracaoExibicaoResponseDTO exibicao() {
        return configuracaoSistemaService.exibicao();
    }
}
