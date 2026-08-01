package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.domain.AlteracaoSenhaPendente;
import br.com.onioncode.motonote.domain.AlteracaoTelefonePendente;
import br.com.onioncode.motonote.domain.Assinatura;
import br.com.onioncode.motonote.domain.ModoValorPedidoObrigatorio;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.StatusAssinatura;
import br.com.onioncode.motonote.domain.TipoAcaoAuditoria;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.dto.AlterarSenhaDTO;
import br.com.onioncode.motonote.dto.PageResponseDTO;
import br.com.onioncode.motonote.dto.SignupRequestDTO;
import br.com.onioncode.motonote.dto.UpdateUsuarioDTO;
import br.com.onioncode.motonote.dto.UsuarioRequestDTO;
import br.com.onioncode.motonote.dto.UsuarioResponseDTO;
import br.com.onioncode.motonote.exception.AcessoNegadoException;
import br.com.onioncode.motonote.exception.ArquivoInvalidoException;
import br.com.onioncode.motonote.exception.CadastroDesabilitadoException;
import br.com.onioncode.motonote.exception.CodigoInvalidoException;
import br.com.onioncode.motonote.exception.SenhaAtualIncorretaException;
import br.com.onioncode.motonote.exception.SenhasNaoConferemException;
import br.com.onioncode.motonote.exception.EmailJaCadastradoException;
import br.com.onioncode.motonote.exception.UsuarioNotFoundException;
import br.com.onioncode.motonote.repository.AlteracaoSenhaPendenteRepo;
import br.com.onioncode.motonote.repository.AlteracaoTelefonePendenteRepo;
import br.com.onioncode.motonote.repository.AssinaturaRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import br.com.onioncode.motonote.util.CodigoUtils;
import br.com.onioncode.motonote.util.ImagemUtils;
import br.com.onioncode.motonote.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class UsuarioService {
    private static final Duration VALIDADE_CODIGO_TELEFONE = Duration.ofMinutes(15);
    private static final int MAX_TENTATIVAS_TELEFONE = 5;
    private static final Duration VALIDADE_CODIGO_SENHA = Duration.ofMinutes(15);
    private static final int MAX_TENTATIVAS_SENHA = 5;

    private final PasswordEncoder passwordEncoder;
    private final UsuarioRepo usuarioRepo;
    private final AssinaturaRepo assinaturaRepo;
    private final AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo;
    private final AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo;
    private final ResendGateway resendGateway;
    private final EmailTemplateService emailTemplateService;
    private final ConfiguracaoSistemaService configuracaoSistemaService;
    private final AuditoriaService auditoriaService;
    private final R2Gateway r2Gateway;
    private final NotificacaoNovoCadastroService notificacaoNovoCadastroService;

    public UsuarioService(PasswordEncoder passwordEncoder, UsuarioRepo user, AssinaturaRepo assinaturaRepo,
                           AuditoriaService auditoriaService, AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo,
                           AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo,
                           ResendGateway resendGateway, EmailTemplateService emailTemplateService,
                           ConfiguracaoSistemaService configuracaoSistemaService, R2Gateway r2Gateway,
                           NotificacaoNovoCadastroService notificacaoNovoCadastroService){
        this.passwordEncoder = passwordEncoder;
        this.usuarioRepo = user;
        this.assinaturaRepo = assinaturaRepo;
        this.auditoriaService = auditoriaService;
        this.alteracaoTelefonePendenteRepo = alteracaoTelefonePendenteRepo;
        this.alteracaoSenhaPendenteRepo = alteracaoSenhaPendenteRepo;
        this.resendGateway = resendGateway;
        this.emailTemplateService = emailTemplateService;
        this.configuracaoSistemaService = configuracaoSistemaService;
        this.r2Gateway = r2Gateway;
        this.notificacaoNovoCadastroService = notificacaoNovoCadastroService;
    }


    public UsuarioResponseDTO save(UsuarioRequestDTO userDTO, Authentication authentication){
        exigirMaster(authentication);

        if(usuarioRepo.existsByEmail(userDTO.getEmail())){
            throw new EmailJaCadastradoException(userDTO.getEmail());
        }

        Usuario save = usuarioRepo.save(requestDTOToUsuario(userDTO));
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.USUARIO_CRIADO,
                "USUARIO", save.getId(), save.getEmail(), Map.of("role", save.getRole().name()));
        return usuarioToDTO(save);
    }


    // Cadastro público autoatendido: diferente de save() (usado pelo MASTER pra
    // criar contas manualmente com qualquer role), aqui a role é sempre fixada
    // em USER — não vem do DTO, então não há como um visitante se auto-promover.
    // Endpoint antigo (POST /api/auth/signup, mantido como rede de segurança
    // — ver CadastroService), mas o toggle de "cadastro público" precisa
    // valer pros dois caminhos, senão desligar um não bloqueia o outro.
    public Usuario signup(SignupRequestDTO dto) {
        if (!configuracaoSistemaService.cadastroPublicoHabilitado()) {
            throw new CadastroDesabilitadoException();
        }
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new SenhasNaoConferemException();
        }

        if (usuarioRepo.existsByEmail(dto.getEmail())) {
            throw new EmailJaCadastradoException(dto.getEmail());
        }

        Usuario usuario = new Usuario();
        usuario.setName(dto.getName());
        usuario.setEmail(dto.getEmail());
        usuario.setPhone(dto.getPhone());
        usuario.setPassword(passwordEncoder.encode(dto.getPassword()));
        usuario.setRole(Role.USER);
        usuario.setCreatedAt(Instant.now());

        Usuario salvo = usuarioRepo.save(usuario);
        notificacaoNovoCadastroService.notificar(salvo);
        return salvo;
    }

    // Listagem paginada (mais recentes primeiro), com filtro opcional por
    // status de assinatura e/ou busca textual (nome/e-mail) — o número de
    // empresas cadastradas no SaaS cresce com o tempo, então não faz
    // sentido trazer todo mundo de uma vez só pra área administrativa do
    // MASTER.
    public PageResponseDTO<UsuarioResponseDTO> findAllPaged(Authentication authentication, int page, int size,
                                                             StatusAssinatura status, String busca) {
        exigirMaster(authentication);
        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean temBusca = busca != null && !busca.isBlank();

        if (status != null) {
            List<String> usuarioIds = resolverUsuarioIdsPorStatus(status);
            if (usuarioIds.isEmpty()) {
                return PageResponseDTO.from(Page.empty(pageable));
            }
            // Combinação status + busca: filtrada em memória (reaproveita o
            // findByIdIn já existente) — mesma técnica já usada logo abaixo
            // pra resolver o caso especial de SEM_ASSINATURA, em vez de uma
            // combinação de filtros mais elaborada no repositório.
            if (temBusca) {
                String termo = busca.toLowerCase();
                List<Usuario> filtrados = usuarioRepo.findAllById(usuarioIds).stream()
                        .filter(u -> u.getName().toLowerCase().contains(termo) || u.getEmail().toLowerCase().contains(termo))
                        .sorted(java.util.Comparator.comparing(Usuario::getCreatedAt,
                                java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                        .toList();
                return PageResponseDTO.from(paginarEmMemoria(filtrados, pageable));
            }
            Page<Usuario> resultado = usuarioRepo.findByIdIn(usuarioIds, pageable);
            return PageResponseDTO.from(resultado.map(this::usuarioToDTO));
        }

        if (temBusca) {
            // ILIKE (Postgres) não interpreta metacaracteres de regex — só os
            // curingas próprios de LIKE (%/_) — então, diferente do $regex do
            // Mongo (PCRE-compatível), não há risco de ReDoS aqui e o termo
            // não precisa de nenhum escaping antes de ir pra query.
            Page<Usuario> resultado = usuarioRepo.findByNomeOuEmailContaining(busca, pageable);
            return PageResponseDTO.from(resultado.map(this::usuarioToDTO));
        }

        Page<Usuario> resultado = usuarioRepo.findAll(pageable);
        return PageResponseDTO.from(resultado.map(this::usuarioToDTO));
    }

    // Pagina manualmente uma lista já em memória (caso status+busca
    // combinados) — usa a mesma metadata de página (número/tamanho) que o
    // resto do endpoint, só sem delegar a consulta pro Mongo.
    private Page<UsuarioResponseDTO> paginarEmMemoria(List<Usuario> todos, Pageable pageable) {
        int inicio = Math.min((int) pageable.getOffset(), todos.size());
        int fim = Math.min(inicio + pageable.getPageSize(), todos.size());
        List<UsuarioResponseDTO> conteudoPagina = todos.subList(inicio, fim).stream().map(this::usuarioToDTO).toList();
        return new org.springframework.data.domain.PageImpl<>(conteudoPagina, pageable, todos.size());
    }

    // Contas criadas manualmente pelo MASTER (save(), diferente de
    // signup()) nunca ganham um placeholder de Assinatura — só o cadastro
    // público cria um (ver AuthenticationController.criarPlaceholder). Pra
    // essas contas, usuarioToDTO() cai no valor padrão SEM_ASSINATURA (linha
    // ~120), então o filtro por esse status precisa enxergar tanto quem tem
    // um documento de Assinatura explícito com esse status quanto quem não
    // tem documento nenhum — senão essas contas somem da listagem filtrada
    // mesmo aparecendo como "Sem assinatura" na tela.
    private List<String> resolverUsuarioIdsPorStatus(StatusAssinatura status) {
        List<String> comDocumentoDesseStatus = assinaturaRepo.findByStatus(status).stream()
                .map(Assinatura::getUsuarioId)
                .toList();

        if (status != StatusAssinatura.SEM_ASSINATURA) {
            return comDocumentoDesseStatus;
        }

        Set<String> usuarioIdsComAlgumDocumento = assinaturaRepo.findAll().stream()
                .map(Assinatura::getUsuarioId)
                .collect(Collectors.toSet());
        List<String> semDocumentoAlgum = usuarioRepo.findAll().stream()
                .map(Usuario::getId)
                .filter(id -> !usuarioIdsComAlgumDocumento.contains(id))
                .toList();

        return Stream.concat(comDocumentoDesseStatus.stream(), semDocumentoAlgum.stream()).toList();
    }

    public UsuarioResponseDTO findById(String id, Authentication authentication){
        exigirMaster(authentication);
        return usuarioToDTO(usuarioRepo.findById(id)
                .orElseThrow(() -> new UsuarioNotFoundException(id)));
    }

    // Usado pelo GET /api/usuarios/me: qualquer usuário autenticado vê o próprio
    // perfil, sem passar por exigirMaster (diferente de findById/findAll).
    public UsuarioResponseDTO meuPerfil(Usuario usuario) {
        return usuarioToDTO(usuario);
    }

    private UsuarioResponseDTO usuarioToDTO(Usuario user) {
        // MASTER é o dono do sistema, não assinante — não faz sentido mostrar
        // "sem assinatura" pra quem nunca teve uma (ver AssinaturaService.statusAtual).
        StatusAssinatura status = user.getRole() == Role.MASTER
                ? null
                : assinaturaRepo.findByUsuarioId(user.getId())
                        .map(a -> a.getStatus())
                        .orElse(StatusAssinatura.SEM_ASSINATURA);
        // Null = comportamento legado (SOMENTE_DINHEIRO) — resolvido aqui
        // pra o frontend sempre receber um valor concreto, mesmo padrão de
        // ConfiguracaoSistemaService ao expor valores efetivos.
        ModoValorPedidoObrigatorio modoValorPedido = user.getModoValorPedidoObrigatorio() != null
                ? user.getModoValorPedidoObrigatorio()
                : ModoValorPedidoObrigatorio.SOMENTE_DINHEIRO;
        return new UsuarioResponseDTO(user.getName(), user.getEmail(), user.getPhone(), user.getRole(), user.getCreatedAt(), status, user.isAtivo(), user.getFotoUrl(),
                modoValorPedido, user.isPermitirDadosCliente(), user.isControleFluxoEntregaHabilitado(), user.isPermitirCadastroClientes(),
                user.isBaixaAutomaticaAoEntregar(), user.isMostrarFaturamentoPedidos());
    }

    // --- Configurações por conta relacionadas a Entrega ---
    // Cada uma salva independente (não sobrescreve as outras), mesmo
    // espírito de ConfiguracaoSistemaService.atualizarXxx.

    public UsuarioResponseDTO atualizarModoValorPedidoObrigatorio(Usuario usuario, ModoValorPedidoObrigatorio modo) {
        usuario.setModoValorPedidoObrigatorio(modo);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    public UsuarioResponseDTO atualizarPermitirDadosCliente(Usuario usuario, boolean habilitado) {
        usuario.setPermitirDadosCliente(habilitado);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    public UsuarioResponseDTO atualizarControleFluxoEntrega(Usuario usuario, boolean habilitado) {
        usuario.setControleFluxoEntregaHabilitado(habilitado);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    // Desligar esta config NUNCA desvincula Entrega.clienteId já gravado —
    // só troca a flag em Usuario, de propósito. Entregas antigas continuam
    // com o vínculo intacto (só deixam de aparecer na tela, que esconde a
    // coluna/campo quando a config está desligada); religar depois volta a
    // mostrar tudo sem perda de dado nenhuma.
    public UsuarioResponseDTO atualizarPermitirCadastroClientes(Usuario usuario, boolean habilitado) {
        usuario.setPermitirCadastroClientes(habilitado);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    public UsuarioResponseDTO atualizarBaixaAutomaticaAoEntregar(Usuario usuario, boolean habilitado) {
        usuario.setBaixaAutomaticaAoEntregar(habilitado);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    public UsuarioResponseDTO atualizarMostrarFaturamentoPedidos(Usuario usuario, boolean habilitado) {
        usuario.setMostrarFaturamentoPedidos(habilitado);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    private Usuario requestDTOToUsuario(UsuarioRequestDTO userDTO){
        Usuario user = new Usuario();
        user.setEmail(userDTO.getEmail());
        user.setName(userDTO.getName());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setRole(userDTO.getRole());
        user.setCreatedAt(Instant.now());
        return user;
    }

    public void alterarSenha(AlterarSenhaDTO alterarSenhaDto, Usuario usuario) {
        if (!passwordEncoder.matches(alterarSenhaDto.getActualPassword(), usuario.getPassword())){
            throw new SenhaAtualIncorretaException(usuario.getName());
        }
        String novaSenhaCriptografada = passwordEncoder.encode(alterarSenhaDto.getNewPassword());

        usuario.setPassword(novaSenhaCriptografada);
        usuarioRepo.save(usuario);
    }

    // Troca de senha em duas etapas — o código vai pro e-mail já cadastrado
    // na conta, mesmo padrão de solicitarAlteracaoTelefone/confirmarAlteracaoTelefone.
    // A nova senha só é gravada no Usuario depois do código confirmado; até
    // lá fica com hash aplicado dentro do AlteracaoSenhaPendente (nunca em
    // texto plano, nem na memória além do escopo deste método).
    public void solicitarAlteracaoSenha(Usuario usuario, AlterarSenhaDTO dto) {
        if (!passwordEncoder.matches(dto.getActualPassword(), usuario.getPassword())) {
            throw new SenhaAtualIncorretaException(usuario.getName());
        }

        alteracaoSenhaPendenteRepo.deleteByUsuarioId(usuario.getId());

        String codigo = CodigoUtils.gerarCodigo();
        Instant agora = Instant.now();

        AlteracaoSenhaPendente pendente = new AlteracaoSenhaPendente();
        pendente.setUsuarioId(usuario.getId());
        pendente.setNovaSenhaHash(passwordEncoder.encode(dto.getNewPassword()));
        pendente.setCodigoHash(passwordEncoder.encode(codigo));
        pendente.setTentativas(0);
        pendente.setCriadoEm(agora);
        pendente.setExpiraEm(agora.plus(VALIDADE_CODIGO_SENHA));
        alteracaoSenhaPendenteRepo.save(pendente);

        String html = emailTemplateService.renderizarCodigo(usuario.getName(),
                "Use o código abaixo para confirmar a troca da sua senha:", codigo);
        resendGateway.enviar(usuario.getEmail(), "Confirme a troca de senha - MotoNote", html);
    }

    public void confirmarAlteracaoSenha(Usuario usuario, String codigo) {
        AlteracaoSenhaPendente pendente = alteracaoSenhaPendenteRepo.findByUsuarioId(usuario.getId())
                .orElseThrow(CodigoInvalidoException::new);

        if (Instant.now().isAfter(pendente.getExpiraEm()) || pendente.getTentativas() >= MAX_TENTATIVAS_SENHA) {
            alteracaoSenhaPendenteRepo.delete(pendente);
            throw new CodigoInvalidoException();
        }

        if (!passwordEncoder.matches(codigo, pendente.getCodigoHash())) {
            pendente.setTentativas(pendente.getTentativas() + 1);
            alteracaoSenhaPendenteRepo.save(pendente);
            throw new CodigoInvalidoException();
        }

        usuario.setPassword(pendente.getNovaSenhaHash());
        usuarioRepo.save(usuario);
        alteracaoSenhaPendenteRepo.delete(pendente);
    }


    // Bloqueia/reativa uma conta sem apagar os dados (diferente de delete()).
    // Efeito é quase imediato: SecurityFilter reavalia isEnabled()/
    // isAccountNonLocked() em toda request autenticada, então uma conta
    // desativada perde acesso mesmo com um token ainda válido, sem precisar
    // de blacklist. Nunca permite mexer numa conta MASTER — evita o MASTER
    // se trancar (ou trancar outro MASTER) fora do próprio painel admin.
    public UsuarioResponseDTO alterarStatusAtivo(String email, boolean ativo, Authentication authentication) {
        exigirMaster(authentication);

        Usuario usuario = usuarioRepo.findByEmail(email)
                .orElseThrow(() -> new UsuarioNotFoundException(email));

        if (usuario.getRole() == Role.MASTER) {
            throw new AcessoNegadoException();
        }

        usuario.setAtivo(ativo);
        usuarioRepo.save(usuario);
        auditoriaService.registrar(authentication,
                ativo ? TipoAcaoAuditoria.USUARIO_REATIVADO : TipoAcaoAuditoria.USUARIO_BLOQUEADO,
                "USUARIO", usuario.getId(), usuario.getEmail(), null);
        return usuarioToDTO(usuario);
    }

    public void delete(String email, Authentication authentication){
        exigirMaster(authentication);

        Usuario user = usuarioRepo.findByEmail(email).orElseThrow(() -> new UsuarioNotFoundException(email));

        usuarioRepo.delete(user);
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.USUARIO_EXCLUIDO,
                "USUARIO", user.getId(), user.getEmail(), null);
    }

    // Edita os dados de um usuário existente (nome, e-mail, role e, opcionalmente, senha).
    // Identificamos o usuário pelo e-mail ATUAL (antes da edição), já que o
    // UsuarioResponseDTO não expõe o id para o frontend.
    public UsuarioResponseDTO update(String emailAtual, UpdateUsuarioDTO dto, Authentication authentication) {
        exigirMaster(authentication);

        Usuario usuario = usuarioRepo.findByEmail(emailAtual)
                .orElseThrow(() -> new UsuarioNotFoundException(emailAtual));

        // Se o e-mail está sendo alterado, garante que o novo e-mail não pertence a outra conta.
        boolean emailAlterado = !usuario.getEmail().equalsIgnoreCase(dto.getEmail());
        if (emailAlterado && usuarioRepo.existsByEmail(dto.getEmail())) {
            throw new EmailJaCadastradoException(dto.getEmail());
        }

        usuario.setName(dto.getName());
        usuario.setEmail(dto.getEmail());
        usuario.setRole(dto.getRole());

        if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        }

        usuarioRepo.save(usuario);
        auditoriaService.registrar(authentication, TipoAcaoAuditoria.USUARIO_EDITADO,
                "USUARIO", usuario.getId(), usuario.getEmail(), null);
        return usuarioToDTO(usuario);
    }

    // Autoedição de nome: livre, sem confirmação por e-mail (diferente de
    // e-mail/telefone, o nome não é usado como prova de identidade em
    // nenhum outro fluxo).
    public UsuarioResponseDTO atualizarNome(Usuario usuario, String novoNome) {
        usuario.setName(novoNome);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    // Foto de perfil: bucket público do R2 (ver R2Gateway) — livre, sem
    // confirmação, mesmo espírito de atualizarNome. Apaga a foto anterior do
    // R2 antes de trocar, pra não acumular arquivo órfão a cada troca.
    public UsuarioResponseDTO atualizarFoto(Usuario usuario, MultipartFile foto) {
        ImagemUtils.validar(foto);
        String key = "perfil/" + usuario.getId() + "/" + UUID.randomUUID() + ImagemUtils.extensaoPara(foto);
        String urlAnterior = usuario.getFotoUrl();

        String novaUrl = r2Gateway.uploadPublico(key, lerBytes(foto), foto.getContentType());
        if (urlAnterior != null) {
            r2Gateway.excluirPublicoPorUrl(urlAnterior);
        }

        usuario.setFotoUrl(novaUrl);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    public UsuarioResponseDTO removerFoto(Usuario usuario) {
        if (usuario.getFotoUrl() != null) {
            r2Gateway.excluirPublicoPorUrl(usuario.getFotoUrl());
        }
        usuario.setFotoUrl(null);
        usuarioRepo.save(usuario);
        return usuarioToDTO(usuario);
    }

    private byte[] lerBytes(MultipartFile arquivo) {
        try {
            return arquivo.getBytes();
        } catch (IOException e) {
            throw new ArquivoInvalidoException("não foi possível ler o arquivo enviado.");
        }
    }

    // Troca de telefone em duas etapas, mesmo padrão de CadastroService/
    // RecuperacaoSenhaService: o código vai pro e-mail JÁ cadastrado na
    // conta (não pro telefone novo), provando que quem está pedindo a troca
    // tem acesso ao e-mail da conta antes de mexer no telefone.
    public void solicitarAlteracaoTelefone(Usuario usuario, String novoTelefone) {
        alteracaoTelefonePendenteRepo.deleteByUsuarioId(usuario.getId());

        String codigo = CodigoUtils.gerarCodigo();
        Instant agora = Instant.now();

        AlteracaoTelefonePendente pendente = new AlteracaoTelefonePendente();
        pendente.setUsuarioId(usuario.getId());
        pendente.setNovoTelefone(novoTelefone);
        pendente.setCodigoHash(passwordEncoder.encode(codigo));
        pendente.setTentativas(0);
        pendente.setCriadoEm(agora);
        pendente.setExpiraEm(agora.plus(VALIDADE_CODIGO_TELEFONE));
        alteracaoTelefonePendenteRepo.save(pendente);

        String html = emailTemplateService.renderizarCodigo(usuario.getName(),
                "Use o código abaixo para confirmar a troca do telefone da sua conta:", codigo);
        resendGateway.enviar(usuario.getEmail(), "Confirme a troca de telefone - MotoNote", html);
    }

    public UsuarioResponseDTO confirmarAlteracaoTelefone(Usuario usuario, String codigo) {
        AlteracaoTelefonePendente pendente = alteracaoTelefonePendenteRepo.findByUsuarioId(usuario.getId())
                .orElseThrow(CodigoInvalidoException::new);

        if (Instant.now().isAfter(pendente.getExpiraEm()) || pendente.getTentativas() >= MAX_TENTATIVAS_TELEFONE) {
            alteracaoTelefonePendenteRepo.delete(pendente);
            throw new CodigoInvalidoException();
        }

        if (!passwordEncoder.matches(codigo, pendente.getCodigoHash())) {
            pendente.setTentativas(pendente.getTentativas() + 1);
            alteracaoTelefonePendenteRepo.save(pendente);
            throw new CodigoInvalidoException();
        }

        usuario.setPhone(pendente.getNovoTelefone());
        usuarioRepo.save(usuario);
        alteracaoTelefonePendenteRepo.delete(pendente);
        return usuarioToDTO(usuario);
    }

    // Garante que somente usuários com role MASTER acessem operações administrativas
    // (listar/buscar/excluir usuários). Lançar aqui bloqueia a requisição inteira,
    // então ADMIN e USER nunca chegam a ver esses dados, mesmo chamando a API direto.
    private void exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
    }
}





