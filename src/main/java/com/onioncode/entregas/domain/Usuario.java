package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usuario")
public class Usuario implements UserDetails {

    @Id
    private String id;
    private String name;
    @Indexed(unique = true)
    private String email;
    private String password;
    private Role role;
    private String phone;
    private Instant createdAt;

    // URL pública direta no R2 (ver R2Gateway/UsuarioService.atualizarFoto) —
    // null enquanto o usuário nunca trocou a foto padrão (iniciais no frontend).
    private String fotoUrl;

    // Bloqueio de conta pelo MASTER (ver UsuarioService.alterarStatusAtivo).
    // Default true no initializer do campo: documentos gravados antes desse
    // campo existir não têm "ativo" no Mongo, e o MappingMongoConverter não
    // mexe em campos ausentes no documento — então eles carregam com o
    // default abaixo (ativo) em vez de ficarem bloqueados sem querer.
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
