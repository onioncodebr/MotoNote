package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

// Índice composto (ver V5__entrega.sql) cobre tanto a listagem simples por
// motoboyId (prefixo do índice) quanto as consultas por intervalo de data,
// já na ordem usada pela paginação (mais recente primeiro).
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "entrega")
public class Entrega extends EntidadeComIdAssinalavel {

    private Double value;
    private LocalDate localDate;
    private String motoboyId;
    // Nulos em entregas antigas (gravadas antes desses campos existirem) —
    // as queries de pendências filtram por valor explícito, então essas
    // entregas antigas simplesmente não entram em nenhuma delas.
    @Enumerated(EnumType.STRING)
    private FormaPagamento formaPagamento;
    @Enumerated(EnumType.STRING)
    private StatusRecebimento status;
    // Valor do pedido (o que o cliente pagou em mãos ao motoboy, quando a
    // forma de pagamento é Dinheiro) — é esse valor, não o `value` (taxa da
    // entrega), que o motoboy precisa repassar ao caixa. Só preenchido
    // quando formaPagamento == DINHEIRO (ver EntregaService.save()).
    private Double valorPedido;

    // Nome do cliente + descrição do pedido, em texto livre — nullable,
    // só obrigatórios (validado em EntregaService.save()) quando a conta
    // tem Usuario.permitirDadosCliente ligado (ver
    // fluxo-entrega-configuracoes.md).
    private String nomeCliente;
    private String descricaoPedido;

    // Cliente cadastrado vinculado (opcional) — validado contra o tenant
    // logado em EntregaService.save(), igual motoboyId. Preenchido só
    // quando Usuario.permitirCadastroClientes está ligado no momento da
    // criação, mas NUNCA é apagado depois disso: desligar a config (ou
    // excluir o Cliente referenciado) não desvincula entregas antigas —
    // só some da tela enquanto a config estiver desligada (ver
    // UsuarioService.atualizarPermitirCadastroClientes).
    private String clienteId;

    // Fluxo logístico da entrega — nullable, só populado quando a conta
    // tem Usuario.controleFluxoEntregaHabilitado ligado. Entregas antigas
    // (ou de contas que nunca ligaram a config) ficam com este campo
    // null — as queries de "pendentes" do fluxo filtram por uma lista
    // explícita de status (NA_LOJA/EM_ROTA/NAO_ENTREGUE), não por
    // "diferente de ENTREGUE", justamente pra não capturar esses nulos.
    @Enumerated(EnumType.STRING)
    private StatusLogisticoEntrega statusLogistico;
    // Obrigatório (validado em EntregaService) só quando
    // statusLogistico == NAO_ENTREGUE.
    private String observacaoNaoEntregue;
}
