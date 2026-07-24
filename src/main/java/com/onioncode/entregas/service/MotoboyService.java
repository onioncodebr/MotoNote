package com.onioncode.entregas.service;


import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.MotoboyMasterResponseDTO;
import com.onioncode.entregas.dto.MotoboyRequestDTO;
import com.onioncode.entregas.dto.MotoboyResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.UpdateMotoboyDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.exception.EmailJaCadastradoException;
import com.onioncode.entregas.exception.MotoboyJaExisteException;
import com.onioncode.entregas.exception.MotoboyListNotFoundException;
import com.onioncode.entregas.exception.MotoboyNameIgualException;
import com.onioncode.entregas.exception.SenhaAtualIncorretaException;
import com.onioncode.entregas.exception.SenhaInvalidaException;
import com.onioncode.entregas.exception.SenhasNaoConferemException;
import com.onioncode.entregas.repository.MotoboyRepo;
import com.onioncode.entregas.repository.UsuarioRepo;
import com.onioncode.entregas.util.PaginacaoUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MotoboyService {

    private final MotoboyRepo motoboyRepo;
    private final UsuarioRepo usuarioRepo;
    private final PasswordEncoder passwordEncoder;

    public MotoboyService(MotoboyRepo motoboyRepo, UsuarioRepo usuarioRepo, PasswordEncoder passwordEncoder) {
        this.motoboyRepo = motoboyRepo;
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public MotoboyResponseDTO save(MotoboyRequestDTO dto, Authentication authentication){

        Usuario user = (Usuario) authentication.getPrincipal();

        if (motoboyRepo.findByNameIgnoreCaseAndUsuarioId(dto.getName(), user.getId()).isPresent()){
            throw new MotoboyJaExisteException(dto.getName());
        }

        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new SenhasNaoConferemException();
        }

        exigirEmailDisponivel(dto.getEmail());

        Motoboy motoboy = requestToMotoboy(dto, user.getId());

        motoboyRepo.save(motoboy);
        return motoboyToResponse(motoboy);

    }

    public List<MotoboyResponseDTO> findAllMotoboy(Authentication authentication){
        Usuario user = (Usuario) authentication.getPrincipal();
        List<Motoboy> all = motoboyRepo.findByUsuarioId(user.getId());

        if(all.isEmpty()){
            throw new MotoboyListNotFoundException();
        }
        return all.stream().map(this::motoboyToResponse).toList();
    }

    // Versão paginada, usada pela tela de gerenciamento de Motoboys — a
    // findAllMotoboy() de cima continua existindo pros dropdowns (Entregas,
    // Relatórios, Visão geral), que precisam da lista inteira de uma vez.
    public PageResponseDTO<MotoboyResponseDTO> findAllMotoboyPaged(Authentication authentication, int page, int size){
        Usuario user = (Usuario) authentication.getPrincipal();
        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Motoboy> resultado = motoboyRepo.findByUsuarioId(user.getId(), pageable);
        return PageResponseDTO.from(resultado.map(this::motoboyToResponse));
    }

    // Paginado porque essa é a listagem de TODOS os motoboys do SaaS (rota
    // MASTER-only) — sem paginação, cresce sem limite junto com a base de
    // clientes. Página vazia não é erro (diferente de findAllMotoboy, que é
    // por tenant): o MASTER pode perfeitamente estar numa página sem
    // resultado, ou o sistema ainda não ter nenhum motoboy cadastrado.
    // "nome" (opcional) filtra server-side — sem isso um filtro só no
    // frontend ficaria inconsistente com a paginação.
    public PageResponseDTO<MotoboyMasterResponseDTO> findAllMotoboyMaster(Authentication authentication, int page, int size, String nome){
        exigirMaster(authentication);

        Pageable pageable = PaginacaoUtils.paginaSegura(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Motoboy> resultado = (nome == null || nome.isBlank())
                ? motoboyRepo.findAll(pageable)
                : motoboyRepo.findByNameContainingIgnoreCase(nome, pageable);

        // Resolve o nome da empresa (tenant) dono de cada motoboy em lote,
        // evitando uma query por linha da página (N+1).
        List<String> usuarioIds = resultado.getContent().stream().map(Motoboy::getUsuarioId).distinct().toList();
        Map<String, String> nomeEmpresaPorUsuarioId = usuarioRepo.findAllById(usuarioIds).stream()
                .collect(Collectors.toMap(Usuario::getId, Usuario::getName, (a, b) -> a, HashMap::new));

        return PageResponseDTO.from(resultado.map(m -> motoboyToMasterResponse(m, nomeEmpresaPorUsuarioId)));
    }

    private MotoboyMasterResponseDTO motoboyToMasterResponse(Motoboy motoboy, Map<String, String> nomeEmpresaPorUsuarioId) {
        String nomeEmpresa = nomeEmpresaPorUsuarioId.getOrDefault(motoboy.getUsuarioId(), "—");
        return new MotoboyMasterResponseDTO(motoboy.getId(), motoboy.getName(), motoboy.getEmail(),
                motoboy.getUsuarioId(), nomeEmpresa);
    }

    // Garante que somente usuários com role MASTER possam listar os motoboys de todos
    // os usuários (rota administrativa). ADMIN e USER recebem 403 mesmo chamando a API direto.
    private void exigirMaster(Authentication authentication) {
        Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
        if (usuarioLogado.getRole() != Role.MASTER) {
            throw new AcessoNegadoException();
        }
    }


    public void delete(String id, String password, Authentication authentication){
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (password == null || !passwordEncoder.matches(password, usuario.getPassword())) {
            throw new SenhaInvalidaException();
        }

        Optional<Motoboy> motoboyOptional = motoboyRepo.findByIdAndUsuarioId(id, usuario.getId());
        Motoboy motoboy = motoboyOptional.orElseThrow(MotoboyListNotFoundException::new);
        motoboyRepo.deleteById(motoboy.getId());
    }

    public MotoboyResponseDTO update(UpdateMotoboyDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();

        // 1. Busca o motoboy que será atualizado
        Motoboy motoboy = motoboyRepo.findByIdAndUsuarioId(dto.getId(), usuario.getId())
                .orElseThrow(MotoboyListNotFoundException::new);

        // 2. Busca TODOS os motoboys deste usuário para checar duplicidade de nome
        List<Motoboy> allMotoboys = motoboyRepo.findByUsuarioId(usuario.getId());

        // 3. Verifica se existe ALGUM OUTRO motoboy com esse nome
        boolean nameExists = allMotoboys.stream()
                .anyMatch(m -> m.getName().equalsIgnoreCase(dto.getNewName())
                        && !m.getId().equals(motoboy.getId())); // IMPORTANTE: exclui o próprio motoboy da checagem

        if (nameExists) {
            throw new MotoboyNameIgualException(dto.getNewName());
        }

        // 4. E-mail: se está mudando, garante que não colide com outra conta
        boolean emailAlterado = !dto.getEmail().equalsIgnoreCase(motoboy.getEmail());
        if (emailAlterado) {
            exigirEmailDisponivel(dto.getEmail());
        }

        // 5. Senha nova é opcional — só troca se vier preenchida
        if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            if (!dto.getNewPassword().equals(dto.getConfirmNewPassword())) {
                throw new SenhasNaoConferemException();
            }
            motoboy.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        }

        // 6. Atualiza e salva
        motoboy.setName(dto.getNewName());
        motoboy.setEmail(dto.getEmail());
        motoboyRepo.save(motoboy);
        return motoboyToResponse(motoboy);
    }

    // Troca de senha feita pelo próprio motoboy (portal), exigindo a senha
    // atual — diferente de update(), que é o dono editando e pode trocar
    // sem saber a senha antiga.
    public void alterarSenhaSelf(AlterarSenhaDTO dto, Motoboy motoboy) {
        if (!passwordEncoder.matches(dto.getActualPassword(), motoboy.getPassword())) {
            throw new SenhaAtualIncorretaException(motoboy.getName());
        }
        motoboy.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        motoboyRepo.save(motoboy);
    }

    // E-mail de motoboy precisa ser único entre TODOS os motoboys e também
    // não pode colidir com o e-mail de login de nenhum Usuario (dono de
    // conta) — senão uma das duas contas fica inalcançável no login, já que
    // AuthorizationService.loadUserByUsername tenta Usuario primeiro.
    private void exigirEmailDisponivel(String email) {
        if (motoboyRepo.existsByEmail(email) || usuarioRepo.existsByEmail(email)) {
            throw new EmailJaCadastradoException(email);
        }
    }


    //metodos utilitarios
    public Motoboy requestToMotoboy(MotoboyRequestDTO dto, String UsuarioId){
        Motoboy motoboy = new Motoboy();
        motoboy.setName(dto.getName());
        motoboy.setUsuarioId(UsuarioId);
        motoboy.setEmail(dto.getEmail());
        motoboy.setPassword(passwordEncoder.encode(dto.getPassword()));
        return motoboy;
    }

    public MotoboyResponseDTO motoboyToResponse(Motoboy motoboy){
        return new MotoboyResponseDTO(motoboy.getId(), motoboy.getName(), motoboy.getEmail());
    }


    public MotoboyResponseDTO findById(String id, Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        Motoboy m = motoboyRepo.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(MotoboyListNotFoundException::new);
        return motoboyToResponse(m);
    }
}
