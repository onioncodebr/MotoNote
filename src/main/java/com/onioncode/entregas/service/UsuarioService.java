package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Assinatura;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.SignupRequestDTO;
import com.onioncode.entregas.dto.UpdateUsuarioDTO;
import com.onioncode.entregas.dto.UsuarioRequestDTO;
import com.onioncode.entregas.dto.UsuarioResponseDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.exception.SenhaAtualIncorretaException;
import com.onioncode.entregas.exception.SenhasNaoConferemException;
import com.onioncode.entregas.exception.EmailJaCadastradoException;
import com.onioncode.entregas.exception.UsuarioNotFoundException;
import com.onioncode.entregas.repository.AssinaturaRepo;
import com.onioncode.entregas.repository.UsuarioRepo;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class UsuarioService {
    private final PasswordEncoder passwordEncoder;
    private final UsuarioRepo usuarioRepo;
    private final AssinaturaRepo assinaturaRepo;

    public UsuarioService(PasswordEncoder passwordEncoder, UsuarioRepo user, AssinaturaRepo assinaturaRepo){
        this.passwordEncoder = passwordEncoder;
        this.usuarioRepo = user;
        this.assinaturaRepo = assinaturaRepo;
    }


    public UsuarioResponseDTO save(UsuarioRequestDTO userDTO, Authentication authentication){
        exigirMaster(authentication);

        if(usuarioRepo.existsByEmail(userDTO.getEmail())){
            throw new EmailJaCadastradoException(userDTO.getEmail());
        }

        Usuario save = usuarioRepo.save(requestDTOToUsuario(userDTO));
        return usuarioToDTO(save);
    }


    // Cadastro público autoatendido: diferente de save() (usado pelo MASTER pra
    // criar contas manualmente com qualquer role), aqui a role é sempre fixada
    // em USER — não vem do DTO, então não há como um visitante se auto-promover.
    public Usuario signup(SignupRequestDTO dto) {
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

        return usuarioRepo.save(usuario);
    }

    // Listagem paginada (mais recentes primeiro), com filtro opcional por
    // status de assinatura — o número de empresas cadastradas no SaaS
    // cresce com o tempo, então não faz sentido trazer todo mundo de uma
    // vez só pra área administrativa do MASTER.
    public PageResponseDTO<UsuarioResponseDTO> findAllPaged(Authentication authentication, int page, int size, StatusAssinatura status) {
        exigirMaster(authentication);
        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (status != null) {
            List<String> usuarioIds = resolverUsuarioIdsPorStatus(status);
            if (usuarioIds.isEmpty()) {
                return PageResponseDTO.from(Page.empty(pageable));
            }
            Page<Usuario> resultado = usuarioRepo.findByIdIn(usuarioIds, pageable);
            return PageResponseDTO.from(resultado.map(this::usuarioToDTO));
        }

        Page<Usuario> resultado = usuarioRepo.findAll(pageable);
        return PageResponseDTO.from(resultado.map(this::usuarioToDTO));
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
        return new UsuarioResponseDTO(user.getName(), user.getEmail(), user.getPhone(), user.getRole(), user.getCreatedAt(), status, user.isAtivo());
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
        return usuarioToDTO(usuario);
    }

    public void delete(String email, Authentication authentication){
        exigirMaster(authentication);

        Usuario user = usuarioRepo.findByEmail(email).orElseThrow(() -> new UsuarioNotFoundException(email));

        usuarioRepo.delete(user);
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





