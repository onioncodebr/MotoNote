package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.ModoValorPedidoObrigatorio;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.StatusAssinatura;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@AllArgsConstructor
@Data
public class UsuarioResponseDTO {

    private String name;
    private String email;
    private String phone;
    private Role role;
    private Instant createdAt;
    // Null pra MASTER (dono do sistema, não é assinante — ver AssinaturaService.statusAtual).
    private StatusAssinatura subscriptionStatus;
    private boolean ativo;
    private String fotoUrl;

    // Configurações por conta relacionadas a Entrega (ver
    // fluxo-entrega-configuracoes.md) — expostas aqui pra o frontend não
    // precisar de um fetch separado, já que este DTO já viaja em
    // getCurrentUser()/login.
    private ModoValorPedidoObrigatorio modoValorPedidoObrigatorio;
    private boolean permitirDadosCliente;
    private boolean controleFluxoEntregaHabilitado;
    private boolean permitirCadastroClientes;
    private boolean baixaAutomaticaAoEntregar;
    private boolean mostrarFaturamentoPedidos;

}
