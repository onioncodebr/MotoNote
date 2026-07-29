package com.onioncode.entregas.controller;

import com.onioncode.entregas.domain.ModoValorPedidoObrigatorio;
import com.onioncode.entregas.domain.StatusAssinatura;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.AlterarSenhaDTO;
import com.onioncode.entregas.dto.AtualizarNomeDTO;
import com.onioncode.entregas.dto.ConfirmarAlteracaoSenhaDTO;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService userServ;

    public UsuarioController(UsuarioService userServ) {
        this.userServ = userServ;
    }

    @PreAuthorize("hasRole('MASTER')")
    @PostMapping("/save")
    public ResponseEntity<UsuarioResponseDTO> saveUsuario(@RequestBody @Valid UsuarioRequestDTO usuario, Authentication authentication){
        return ResponseEntity.status(HttpStatus.CREATED).body(userServ.save(usuario, authentication));
    }

    @PreAuthorize("hasRole('MASTER')")
    @GetMapping("/findAll")
    public ResponseEntity<PageResponseDTO<UsuarioResponseDTO>> findAllUsuarios(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) StatusAssinatura status,
            @RequestParam(required = false) String busca,
            Authentication authentication){
        return ResponseEntity.status(HttpStatus.OK).body(userServ.findAllPaged(authentication, page, size, status, busca));
    }

    @PreAuthorize("hasRole('MASTER')")
    @GetMapping("/find")
    public ResponseEntity<UsuarioResponseDTO> findById(@RequestParam String id, Authentication authentication){
        return  ResponseEntity.status(HttpStatus.OK).body(userServ.findById(id, authentication));
    }

    @PreAuthorize("hasRole('MASTER')")
    @PutMapping("/update")
    public ResponseEntity<UsuarioResponseDTO> updateUsuario(@RequestParam String email,
                                                             @RequestBody @Valid UpdateUsuarioDTO dto,
                                                             Authentication authentication){
        return ResponseEntity.ok(userServ.update(email, dto, authentication));
    }

    @PreAuthorize("hasRole('MASTER')")
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

    // Troca de senha em duas etapas — o código vai pro e-mail já cadastrado
    // na conta (ver UsuarioService.solicitarAlteracaoSenha). O endpoint
    // acima (PUT /me/senha, sem código) continua existindo — usado hoje só
    // pelo portal do motoboy (MotoboyService.alterarSenhaSelf é separado
    // deste, mas segue o mesmo espírito de troca direta).
    @PostMapping("/me/senha/solicitar-codigo")
    public ResponseEntity<Void> solicitarAlteracaoSenha(@RequestBody @Valid AlterarSenhaDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        userServ.solicitarAlteracaoSenha(usuario, dto);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/senha/confirmar")
    public ResponseEntity<Void> confirmarAlteracaoSenha(@RequestBody @Valid ConfirmarAlteracaoSenhaDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        userServ.confirmarAlteracaoSenha(usuario, dto.getCodigo());
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

    // Foto de perfil: livre, sem confirmação (mesmo espírito de /me/nome).
    @PostMapping("/me/foto")
    public ResponseEntity<UsuarioResponseDTO> atualizarFoto(@RequestParam("foto") MultipartFile foto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarFoto(usuario, foto));
    }

    @DeleteMapping("/me/foto")
    public ResponseEntity<UsuarioResponseDTO> removerFoto(Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.removerFoto(usuario));
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

    @PreAuthorize("hasRole('MASTER')")
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteUsuario(@RequestParam String email, Authentication authentication){

        userServ.delete(email, authentication);

        return ResponseEntity.noContent().build();
    }

    // --- Configurações por conta relacionadas a Entrega (ver
    // fluxo-entrega-configuracoes.md) — cada uma salva independente,
    // mesmo espírito de ConfiguracaoSistemaController. ---

    public record HabilitadoDTO(boolean habilitado) {
    }

    public record ModoValorPedidoObrigatorioDTO(@jakarta.validation.constraints.NotNull ModoValorPedidoObrigatorio modo) {
    }

    @PutMapping("/me/configuracoes/valor-pedido-obrigatorio")
    public ResponseEntity<UsuarioResponseDTO> atualizarModoValorPedidoObrigatorio(
            @RequestBody @Valid ModoValorPedidoObrigatorioDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarModoValorPedidoObrigatorio(usuario, dto.modo()));
    }

    @PutMapping("/me/configuracoes/dados-cliente")
    public ResponseEntity<UsuarioResponseDTO> atualizarPermitirDadosCliente(
            @RequestBody HabilitadoDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarPermitirDadosCliente(usuario, dto.habilitado()));
    }

    @PutMapping("/me/configuracoes/fluxo-entrega")
    public ResponseEntity<UsuarioResponseDTO> atualizarControleFluxoEntrega(
            @RequestBody HabilitadoDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarControleFluxoEntrega(usuario, dto.habilitado()));
    }

    @PutMapping("/me/configuracoes/cadastro-clientes")
    public ResponseEntity<UsuarioResponseDTO> atualizarPermitirCadastroClientes(
            @RequestBody HabilitadoDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarPermitirCadastroClientes(usuario, dto.habilitado()));
    }

    @PutMapping("/me/configuracoes/baixa-automatica-entrega")
    public ResponseEntity<UsuarioResponseDTO> atualizarBaixaAutomaticaAoEntregar(
            @RequestBody HabilitadoDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarBaixaAutomaticaAoEntregar(usuario, dto.habilitado()));
    }

    @PutMapping("/me/configuracoes/faturamento-pedidos")
    public ResponseEntity<UsuarioResponseDTO> atualizarMostrarFaturamentoPedidos(
            @RequestBody HabilitadoDTO dto, Authentication auth) {
        Usuario usuario = (Usuario) auth.getPrincipal();
        return ResponseEntity.ok(userServ.atualizarMostrarFaturamentoPedidos(usuario, dto.habilitado()));
    }
}
