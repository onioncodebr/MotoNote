package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
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
            Authentication authentication){
        return ResponseEntity.status(HttpStatus.OK).body(userServ.findAllPaged(authentication, page, size, status));
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

    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteUsuario(@RequestParam String email, Authentication authentication){

        userServ.delete(email, authentication);

        return ResponseEntity.noContent().build();
    }
}
