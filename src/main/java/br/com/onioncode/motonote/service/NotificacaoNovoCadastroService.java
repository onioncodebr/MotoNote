package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// Notifica o e-mail configurado pelo MASTER (ver ConfiguracaoSistemaService.
// atualizarNotificacaoCadastro) sempre que um novo Usuario se autocadastra —
// tanto pelo cadastro direto (UsuarioService.signup) quanto pelo cadastro em
// duas etapas com confirmação por e-mail (CadastroService.confirmarCadastro).
// Contas criadas manualmente pelo MASTER (UsuarioService.save) não disparam
// essa notificação — não é um "novo cadastro" no sentido de autoatendimento.
@Service
public class NotificacaoNovoCadastroService {

    private static final Logger log = LoggerFactory.getLogger(NotificacaoNovoCadastroService.class);

    private final ConfiguracaoSistemaService configuracaoSistemaService;
    private final ResendGateway resendGateway;
    private final EmailTemplateService emailTemplateService;

    public NotificacaoNovoCadastroService(ConfiguracaoSistemaService configuracaoSistemaService,
                                           ResendGateway resendGateway, EmailTemplateService emailTemplateService) {
        this.configuracaoSistemaService = configuracaoSistemaService;
        this.resendGateway = resendGateway;
        this.emailTemplateService = emailTemplateService;
    }

    // Nunca propaga exceção: uma falha ao notificar (ex.: instabilidade do
    // Resend) não pode derrubar o cadastro em si, que já foi persistido com
    // sucesso antes desta chamada — mesmo princípio de AuditoriaService.registrar.
    public void notificar(Usuario novoUsuario) {
        try {
            String destino = configuracaoSistemaService.notificacaoCadastroDestino();
            if (destino == null) {
                return;
            }
            String html = emailTemplateService.renderizarNotificacaoCadastro(novoUsuario.getName(), novoUsuario.getEmail());
            resendGateway.enviar(destino, "Novo cadastro no MotoNote", html);
        } catch (Exception e) {
            log.error("Falha ao notificar novo cadastro (usuarioId={})", novoUsuario.getId(), e);
        }
    }
}
