package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.AtualizarNomeDTO;
import com.onioncode.entregas.dto.ConfirmarAlteracaoTelefoneDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.SolicitarAlteracaoTelefoneDTO;
import com.onioncode.entregas.dto.UpdateUsuarioDTO;
import com.onioncode.entregas.dto.UsuarioRequestDTO;
import com.onioncode.entregas.dto.UsuarioResponseDTO;
import com.onioncode.entregas.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService userServ;

    public UsuarioController(UsuarioService userServ) {
        this.userServ = userServ;
    }

    @PostMapping("/save")
    public ResponseEntity<UsuarioResponseDTO> saveUsuario(@RequestBody @Valid UsuarioRequestDTO usuario, Authentication authentication){
        return ResponseEntity.status(HttpStatus.CREATED).body(userServ.save(usuario, authentication));
    }

    @GetMapping("/findAll")
    public ResponseEntity<PageResponseDTO<UsuarioResponseDTO>> findAllUsuarios(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) StatusAssinatura status,
            @RequestParam(required = false) String busca,
            Authentication authentication){
        return ResponseEntity.status(HttpStatus.OK).body(userServ.findAllPaged(authentication, page, size, status, busca));
    }

    @GetMapping("/find")
    public ResponseEntity<UsuarioResponseDTO> findById(@RequestParam String id, Authentication authentication){
        return  ResponseEntity.status(HttpStatus.OK).body(userServ.findById(id, authentication));
    }

    @PutMapping("/update")
    public ResponseEntity<UsuarioResponseDTO> updateUsuario(@RequestParam String email,
                                                             @RequestBody @Valid UpdateUsuarioDTO dto,
                                                             Authentication authentication){
        return ResponseEntity.ok(userServ.update(email, dto, authentication));
    }

    @PatchMapping("/status")
    public ResponseEntity<UsuarioResponseDTO> alterarStatusAtivo(@RequestParam String email,
                                                                   @RequestParam boolean ativo,
                                                                   Authentication authentication){
        return ResponseEntity.ok(userServ.alterarStatusAtivo(email, ativo, authentication));
    }

    @PutMapping("/me/senha")
    public ResponseEntity<Void> alterarSenha(@RequestBody @Valid AlterarSenhaDTO alterarSenhaDto, Authentication authentication){
        Usuario usuario = (Usuario) authentication.getPrincipal();

        userServ.alterarSenha(alterarSenhaDto, usuario);

        return ResponseEntity.noContent().build();

    }



    @GetMapping("/me")
    public UsuarioResponseDTO me(Authentication auth){
        Usuario usuario = (Usuario) auth.getPrincipal();
        return userServ.meuPerfil(usuario);
    }

    // Troca de nome: livre, sem confirmação por e-mail.
    @PutMapping("/me/nome")
    public ResponseEntity<UsuarioResponseDTO> atualizarNome(@RequestBody @Valid AtualizarNomeDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarNome(usuario, dto.getName()));
    }

    // Troca de telefone em duas etapas — o código vai pro e-mail já
    // cadastrado na conta (ver UsuarioService.solicitarAlteracaoTelefone).
    @PostMapping("/me/telefone/solicitar-codigo")
    public ResponseEntity<Void> solicitarAlteracaoTelefone(@RequestBody @Valid SolicitarAlteracaoTelefoneDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        userServ.solicitarAlteracaoTelefone(usuario, dto.getNovoTelefone());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/telefone/confirmar")
    public ResponseEntity<UsuarioResponseDTO> confirmarAlteracaoTelefone(@RequestBody @Valid ConfirmarAlteracaoTelefoneDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.confirmarAlteracaoTelefone(usuario, dto.getCodigo()));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteUsuario(@RequestParam String email, Authentication authentication){

        userServ.delete(email, authentication);

        return ResponseEntity.noContent().build();
    }
}
