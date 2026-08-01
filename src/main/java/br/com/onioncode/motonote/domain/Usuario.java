package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "usuario")
public class Usuario extends EntidadeComIdAssinalavel implements UserDetails {

    private String name;
    private String email;
    private String password;
    @Enumerated(EnumType.STRING)
    private Role role;
    private String phone;
    private Instant createdAt;

    // URL pública direta no R2 (ver R2Gateway/UsuarioService.atualizarFoto) —
    // null enquanto o usuário nunca trocou a foto padrão (iniciais no frontend).
    private String fotoUrl;

    // Bloqueio de conta pelo MASTER (ver UsuarioService.alterarStatusAtivo).
    // Coluna com DEFAULT TRUE no schema (ver V1__usuario.sql) e default true
    // aqui no initializer do campo, pela mesma razão: nenhum registro migrado
    // do backup fica bloqueado sem querer por ausência do valor.
    private boolean ativo = true;

    // Atualizado (com throttle) a cada request autenticada bem-sucedida —
    // ver SecurityFilter. Aproximação de "logado agora" pro painel MASTER:
    // não existe sessão com estado (JWT stateless), então isso é a métrica
    // possível sem migrar a arquitetura de login.
    private Instant ultimoAcessoEm;

    // --- Configurações por conta relacionadas a Entrega (ver
    // fluxo-entrega-configuracoes.md) ---

    // Null = SOMENTE_DINHEIRO (comportamento legado: valor do pedido só
    // obrigatório quando a forma de pagamento é Dinheiro).
    @Enumerated(EnumType.STRING)
    private ModoValorPedidoObrigatorio modoValorPedidoObrigatorio;

    // Opt-in, desligado por padrão — documentos existentes sem este campo
    // desserializam como false (primitivo), mesma convenção de
    // ConfiguracaoSistema.bannerHabilitado/popupHabilitado.
    private boolean permitirDadosCliente;
    private boolean controleFluxoEntregaHabilitado;
    private boolean permitirCadastroClientes;

    // Ao marcar uma entrega em Dinheiro como Entregue (statusLogistico),
    // confirma automaticamente o recebimento (StatusRecebimento.RECEBIDO) —
    // só faz sentido com controleFluxoEntregaHabilitado também ligado, mas
    // é uma config independente (ver EntregaService.atualizarStatusLogistico/
    // atualizarStatusLogisticoEmMassa).
    private boolean baixaAutomaticaAoEntregar;

    // Liga dois efeitos juntos: torna valor do pedido obrigatório em TODA
    // entrega (mesmo efeito de modoValorPedidoObrigatorio=TODAS_ENTREGAS, só
    // que por essa flag em vez do enum) e libera o card "Faturamento dos
    // Pedidos" (soma de valorPedido) na Visão Geral — sem valorPedido
    // garantido em toda entrega, essa soma ficaria incompleta/enganosa, daí
    // as duas coisas serem uma coisa só (ver EntregaService.save()).
    private boolean mostrarFaturamentoPedidos;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority("ROLE_" + role.name())
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return ativo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }
}
