package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.CadastroPendente;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.ConfirmarCadastroDTO;
import br.com.onioncode.motonote.dto.SignupRequestDTO;
import br.com.onioncode.motonote.exception.CadastroDesabilitadoException;
import br.com.onioncode.motonote.exception.CodigoInvalidoException;
import br.com.onioncode.motonote.exception.EmailJaCadastradoException;
import br.com.onioncode.motonote.exception.SenhasNaoConferemException;
import br.com.onioncode.motonote.repository.CadastroPendenteRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import br.com.onioncode.motonote.util.CodigoUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

// Cadastro público em duas etapas: iniciarCadastro manda um código por
// e-mail sem criar nada em definitivo; confirmarCadastro só então grava o
// Usuario de verdade. O endpoint antigo de cadastro direto (UsuarioService.
// signup, via POST /api/auth/signup) continua existindo à parte — este
// service não mexe nele.
@Service
public class CadastroService {

    private static final Duration VALIDADE_CODIGO = Duration.ofMinutes(15);
    private static final int MAX_TENTATIVAS = 5;

    private final CadastroPendenteRepo cadastroPendenteRepo;
    private final UsuarioRepo usuarioRepo;
    private final PasswordEncoder passwordEncoder;
    private final ResendGateway resendGateway;
    private final EmailTemplateService emailTemplateService;
    private final ConfiguracaoSistemaService configuracaoSistemaService;
    private final NotificacaoNovoCadastroService notificacaoNovoCadastroService;

    public CadastroService(CadastroPendenteRepo cadastroPendenteRepo, UsuarioRepo usuarioRepo,
                            PasswordEncoder passwordEncoder, ResendGateway resendGateway,
                            EmailTemplateService emailTemplateService, ConfiguracaoSistemaService configuracaoSistemaService,
                            NotificacaoNovoCadastroService notificacaoNovoCadastroService) {
        this.cadastroPendenteRepo = cadastroPendenteRepo;
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = passwordEncoder;
        this.resendGateway = resendGateway;
        this.emailTemplateService = emailTemplateService;
        this.configuracaoSistemaService = configuracaoSistemaService;
        this.notificacaoNovoCadastroService = notificacaoNovoCadastroService;
    }

    // Reenviar código = chamar de novo (idempotente): apaga o pendente
    // anterior e cria outro com um código novo.
    public void iniciarCadastro(SignupRequestDTO dto) {
        if (!configuracaoSistemaService.cadastroPublicoHabilitado()) {
            throw new CadastroDesabilitadoException();
        }
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new SenhasNaoConferemException();
        }
        if (usuarioRepo.existsByEmail(dto.getEmail())) {
            throw new EmailJaCadastradoException(dto.getEmail());
        }

        cadastroPendenteRepo.deleteByEmail(dto.getEmail());

        String codigo = CodigoUtils.gerarCodigo();
        Instant agora = Instant.now();

        CadastroPendente pendente = new CadastroPendente();
        pendente.setEmail(dto.getEmail());
        pendente.setName(dto.getName());
        pendente.setPhone(dto.getPhone());
        pendente.setSenhaHash(passwordEncoder.encode(dto.getPassword()));
        pendente.setCodigoHash(passwordEncoder.encode(codigo));
        pendente.setTentativas(0);
        pendente.setCriadoEm(agora);
        pendente.setExpiraEm(agora.plus(VALIDADE_CODIGO));
        cadastroPendenteRepo.save(pendente);

        String html = emailTemplateService.renderizarCodigo(dto.getName(),
                "Use o código abaixo para confirmar seu cadastro no MotoNote:", codigo);
        resendGateway.enviar(dto.getEmail(), "Confirme seu cadastro no MotoNote", html);
    }

    public Usuario confirmarCadastro(ConfirmarCadastroDTO dto) {
        CadastroPendente pendente = cadastroPendenteRepo.findByEmail(dto.getEmail())
                .orElseThrow(CodigoInvalidoException::new);

        if (Instant.now().isAfter(pendente.getExpiraEm()) || pendente.getTentativas() >= MAX_TENTATIVAS) {
            cadastroPendenteRepo.delete(pendente);
            throw new CodigoInvalidoException();
        }

        if (!passwordEncoder.matches(dto.getCodigo(), pendente.getCodigoHash())) {
            pendente.setTentativas(pendente.getTentativas() + 1);
            cadastroPendenteRepo.save(pendente);
            throw new CodigoInvalidoException();
        }

        // Checagem de novo (o e-mail pode ter sido cadastrado por outro
        // caminho enquanto esse código estava pendente).
        if (usuarioRepo.existsByEmail(pendente.getEmail())) {
            cadastroPendenteRepo.delete(pendente);
            throw new EmailJaCadastradoException(pendente.getEmail());
        }

        Usuario usuario = new Usuario();
        usuario.setName(pendente.getName());
        usuario.setEmail(pendente.getEmail());
        usuario.setPhone(pendente.getPhone());
        usuario.setPassword(pendente.getSenhaHash());
        usuario.setRole(Role.USER);
        usuario.setCreatedAt(Instant.now());
        Usuario salvo = usuarioRepo.save(usuario);
        notificacaoNovoCadastroService.notificar(salvo);

        cadastroPendenteRepo.delete(pendente);
        return salvo;
    }
}
