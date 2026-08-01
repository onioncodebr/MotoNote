package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.CodigoRecuperacaoSenha;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.RedefinirSenhaDTO;
import br.com.onioncode.motonote.exception.CodigoInvalidoException;
import br.com.onioncode.motonote.exception.SenhasNaoConferemException;
import br.com.onioncode.motonote.repository.CodigoRecuperacaoSenhaRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import br.com.onioncode.motonote.util.CodigoUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class RecuperacaoSenhaService {

    private static final Duration VALIDADE_CODIGO = Duration.ofMinutes(15);
    private static final int MAX_TENTATIVAS = 5;

    private final CodigoRecuperacaoSenhaRepo codigoRepo;
    private final UsuarioRepo usuarioRepo;
    private final PasswordEncoder passwordEncoder;
    private final ResendGateway resendGateway;
    private final EmailTemplateService emailTemplateService;

    public RecuperacaoSenhaService(CodigoRecuperacaoSenhaRepo codigoRepo, UsuarioRepo usuarioRepo,
                                    PasswordEncoder passwordEncoder, ResendGateway resendGateway,
                                    EmailTemplateService emailTemplateService) {
        this.codigoRepo = codigoRepo;
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = passwordEncoder;
        this.resendGateway = resendGateway;
        this.emailTemplateService = emailTemplateService;
    }

    // Silenciosamente não faz nada se o e-mail não existir — a resposta ao
    // cliente é sempre 204 (ver AuthenticationController), pra não dar como
    // enumerar quais e-mails têm conta.
    public void solicitarRecuperacao(String email) {
        Usuario usuario = usuarioRepo.findByEmail(email).orElse(null);
        if (usuario == null) {
            return;
        }

        codigoRepo.deleteByEmail(email);

        String codigo = CodigoUtils.gerarCodigo();
        Instant agora = Instant.now();

        CodigoRecuperacaoSenha registro = new CodigoRecuperacaoSenha();
        registro.setEmail(email);
        registro.setCodigoHash(passwordEncoder.encode(codigo));
        registro.setTentativas(0);
        registro.setUsado(false);
        registro.setCriadoEm(agora);
        registro.setExpiraEm(agora.plus(VALIDADE_CODIGO));
        codigoRepo.save(registro);

        String html = emailTemplateService.renderizarCodigo(usuario.getName(),
                "Use o código abaixo para redefinir sua senha no MotoNote:", codigo);
        resendGateway.enviar(email, "Recuperação de senha - MotoNote", html);
    }

    // Não loga automaticamente depois de trocar a senha — força um login
    // novo com a senha nova, mais simples e mais seguro que emitir cookie aqui.
    public void redefinirSenha(RedefinirSenhaDTO dto) {
        if (!dto.getNovaSenha().equals(dto.getConfirmarNovaSenha())) {
            throw new SenhasNaoConferemException();
        }

        CodigoRecuperacaoSenha registro = codigoRepo.findByEmail(dto.getEmail())
                .orElseThrow(CodigoInvalidoException::new);

        if (registro.isUsado() || Instant.now().isAfter(registro.getExpiraEm())
                || registro.getTentativas() >= MAX_TENTATIVAS) {
            codigoRepo.delete(registro);
            throw new CodigoInvalidoException();
        }

        if (!passwordEncoder.matches(dto.getCodigo(), registro.getCodigoHash())) {
            registro.setTentativas(registro.getTentativas() + 1);
            codigoRepo.save(registro);
            throw new CodigoInvalidoException();
        }

        Usuario usuario = usuarioRepo.findByEmail(dto.getEmail())
                .orElseThrow(CodigoInvalidoException::new);
        usuario.setPassword(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepo.save(usuario);

        codigoRepo.delete(registro);
    }
}
