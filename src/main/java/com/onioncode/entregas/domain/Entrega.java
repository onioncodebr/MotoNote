package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

// Índice composto cobre tanto a listagem simples por motoboyId (prefixo do
// índice) quanto as consultas por intervalo de data, já na ordem usada pela
// paginação (mais recente primeiro).
@CompoundIndex(name = "motoboyId_localDate_idx", def = "{'motoboyId': 1, 'localDate': -1}")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Data
@Document(collection = "entrega")
public class Entrega {

    @Id
    private String id;
    private Double value;
    private LocalDate localDate;
    private String motoboyId;
    // Nulos em entregas antigas (gravadas antes desses campos existirem) —
    // as queries de pendências filtram por valor explícito, então essas
    // entregas antigas simplesmente não entram em nenhuma delas.
    private FormaPagamento formaPagamento;
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
    private StatusLogisticoEntrega statusLogistico;
    // Obrigatório (validado em EntregaService) só quando
    // statusLogistico == NAO_ENTREGUE.
    private String observacaoNaoEntregue;
}
