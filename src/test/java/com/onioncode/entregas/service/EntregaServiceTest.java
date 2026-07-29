package com.onioncode.entregas.service;

import com.onioncode.entregas.domain.Cliente;
import com.onioncode.entregas.domain.Entrega;
import com.onioncode.entregas.domain.FormaPagamento;
import com.onioncode.entregas.domain.ModoValorPedidoObrigatorio;
import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.StatusLogisticoEntrega;
import com.onioncode.entregas.domain.StatusRecebimento;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.dto.EntregaRequestDTO;
import com.onioncode.entregas.exception.AcessoNegadoException;
import com.onioncode.entregas.exception.ClienteNotFoundException;
import com.onioncode.entregas.exception.DadosClienteObrigatoriosException;
import com.onioncode.entregas.exception.EntregaNaoPendenteException;
import com.onioncode.entregas.exception.ObservacaoObrigatoriaException;
import com.onioncode.entregas.exception.ValorPedidoMenorQueEntregaException;
import com.onioncode.entregas.exception.ValorPedidoObrigatorioException;
import com.onioncode.entregas.repository.ClienteRepo;
import com.onioncode.entregas.repository.EntregaRepo;
import com.onioncode.entregas.repository.MotoboyRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Cobre as regras de StatusRecebimento/StatusLogisticoEntrega descritas em
// melhorias.md 1.5 — camada de maior risco financeiro (é o que decide se um
// valor em dinheiro com o motoboy conta como pendente de repasse ou não).
@ExtendWith(MockitoExtension.class)
class EntregaServiceTest {

    private static final String USUARIO_ID = "usuario-1";
    private static final String MOTOBOY_ID = "motoboy-1";

    @Mock
    private EntregaRepo entregaRepo;
    @Mock
    private MotoboyRepo motoboyRepo;
    @Mock
    private ClienteRepo clienteRepo;
    @Mock
    private Authentication authentication;

    private EntregaService service() {
        return new EntregaService(entregaRepo, motoboyRepo, clienteRepo);
    }

    private static Usuario usuario() {
        Usuario usuario = new Usuario();
        usuario.setId(USUARIO_ID);
        return usuario;
    }

    private void autenticarComo(Usuario usuario) {
        when(authentication.getPrincipal()).thenReturn(usuario);
    }

    private void mockMotoboyDoTenant() {
        Motoboy motoboy = new Motoboy();
        motoboy.setId(MOTOBOY_ID);
        motoboy.setUsuarioId(USUARIO_ID);
        when(motoboyRepo.findByIdAndUsuarioId(MOTOBOY_ID, USUARIO_ID)).thenReturn(Optional.of(motoboy));
    }

    private static EntregaRequestDTO dto(FormaPagamento forma, Double value, Double valorPedido) {
        EntregaRequestDTO dto = new EntregaRequestDTO();
        dto.setMotoboyId(MOTOBOY_ID);
        dto.setFormaPagamento(forma);
        dto.setValue(value);
        dto.setValorPedido(valorPedido);
        return dto;
    }

    // --- Valor do pedido obrigatório ---

    @Test
    void dinheiroSemValorPedidoLancaExcecao() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        assertThatThrownBy(() -> service().save(dto(FormaPagamento.DINHEIRO, 10.0, null), authentication))
                .isInstanceOf(ValorPedidoObrigatorioException.class);
    }

    @Test
    void pixSemValorPedidoNaoExigeQuandoModoPadrao() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        service().save(dto(FormaPagamento.PIX, 10.0, null), authentication);

        verify(entregaRepo).save(any(Entrega.class));
    }

    @Test
    void pixSemValorPedidoLancaExcecaoQuandoModoTodasEntregas() {
        Usuario usuario = usuario();
        usuario.setModoValorPedidoObrigatorio(ModoValorPedidoObrigatorio.TODAS_ENTREGAS);
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        assertThatThrownBy(() -> service().save(dto(FormaPagamento.PIX, 10.0, null), authentication))
                .isInstanceOf(ValorPedidoObrigatorioException.class);
    }

    // Cobre a regra adicionada junto com "Faturamento dos pedidos" (ver
    // ConfiguracoesView/Usuario.mostrarFaturamentoPedidos): essa config
    // também torna o valor do pedido obrigatório, senão a soma do
    // faturamento dos pedidos ficaria incompleta.
    @Test
    void pixSemValorPedidoLancaExcecaoQuandoFaturamentoDosPedidosHabilitado() {
        Usuario usuario = usuario();
        usuario.setMostrarFaturamentoPedidos(true);
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        assertThatThrownBy(() -> service().save(dto(FormaPagamento.PIX, 10.0, null), authentication))
                .isInstanceOf(ValorPedidoObrigatorioException.class);
    }

    @Test
    void valorPedidoMenorOuIgualAoValorDaEntregaLancaExcecao() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        assertThatThrownBy(() -> service().save(dto(FormaPagamento.DINHEIRO, 20.0, 20.0), authentication))
                .isInstanceOf(ValorPedidoMenorQueEntregaException.class);
    }

    // --- Dados do cliente (texto livre) ---

    @Test
    void permitirDadosClienteSemNomeOuDescricaoLancaExcecao() {
        Usuario usuario = usuario();
        usuario.setPermitirDadosCliente(true);
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        EntregaRequestDTO dto = dto(FormaPagamento.PIX, 10.0, 20.0);
        assertThatThrownBy(() -> service().save(dto, authentication))
                .isInstanceOf(DadosClienteObrigatoriosException.class);
    }

    // --- Cliente vinculado (cadastro completo) ---

    @Test
    void clienteIdDeOutroTenantLancaClienteNotFound() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        when(clienteRepo.findByIdAndUsuarioId("cliente-de-outra-conta", USUARIO_ID)).thenReturn(Optional.empty());

        EntregaRequestDTO dto = dto(FormaPagamento.PIX, 10.0, 20.0);
        dto.setClienteId("cliente-de-outra-conta");

        assertThatThrownBy(() -> service().save(dto, authentication))
                .isInstanceOf(ClienteNotFoundException.class);
    }

    @Test
    void clienteIdDoProprioTenantPassa() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        when(clienteRepo.findByIdAndUsuarioId("cliente-1", USUARIO_ID))
                .thenReturn(Optional.of(new Cliente()));

        EntregaRequestDTO dto = dto(FormaPagamento.PIX, 10.0, 20.0);
        dto.setClienteId("cliente-1");

        service().save(dto, authentication);

        verify(entregaRepo).save(any(Entrega.class));
    }

    // --- Status nasce PENDENTE só em Dinheiro ---

    @Test
    void entregaEmDinheiroNascePendente() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        EntregaSalvaCaptor captor = new EntregaSalvaCaptor(entregaRepo);
        service().save(dto(FormaPagamento.DINHEIRO, 10.0, 20.0), authentication);

        assertThat(captor.ultimaEntregaSalva().getStatus()).isEqualTo(StatusRecebimento.PENDENTE);
    }

    @Test
    void entregaEmPixNasceRecebida() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        EntregaSalvaCaptor captor = new EntregaSalvaCaptor(entregaRepo);
        service().save(dto(FormaPagamento.PIX, 10.0, null), authentication);

        assertThat(captor.ultimaEntregaSalva().getStatus()).isEqualTo(StatusRecebimento.RECEBIDO);
    }

    @Test
    void statusLogisticoNasceNaLojaSoComControleDeFluxoHabilitado() {
        Usuario usuario = usuario();
        usuario.setControleFluxoEntregaHabilitado(true);
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        EntregaSalvaCaptor captor = new EntregaSalvaCaptor(entregaRepo);
        service().save(dto(FormaPagamento.PIX, 10.0, null), authentication);

        assertThat(captor.ultimaEntregaSalva().getStatusLogistico()).isEqualTo(StatusLogisticoEntrega.NA_LOJA);
    }

    @Test
    void statusLogisticoNascaNuloSemControleDeFluxo() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();

        EntregaSalvaCaptor captor = new EntregaSalvaCaptor(entregaRepo);
        service().save(dto(FormaPagamento.PIX, 10.0, null), authentication);

        assertThat(captor.ultimaEntregaSalva().getStatusLogistico()).isNull();
    }

    // --- darBaixa: confirmação manual de repasse ---

    @Test
    void darBaixaConfirmaEntregaPendenteEmDinheiro() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        Entrega entrega = entregaPendente();
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entrega));

        service().darBaixa("entrega-1", authentication);

        assertThat(entrega.getStatus()).isEqualTo(StatusRecebimento.RECEBIDO);
        verify(entregaRepo).save(entrega);
    }

    @Test
    void darBaixaEmEntregaJaRecebidaLancaExcecao() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        Entrega entrega = entregaPendente();
        entrega.setStatus(StatusRecebimento.RECEBIDO);
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entrega));

        assertThatThrownBy(() -> service().darBaixa("entrega-1", authentication))
                .isInstanceOf(EntregaNaoPendenteException.class);
    }

    @Test
    void darBaixaEmEntregaQueNaoEDinheiroLancaExcecao() {
        Usuario usuario = usuario();
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        Entrega entrega = entregaPendente();
        entrega.setFormaPagamento(FormaPagamento.PIX);
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entrega));

        assertThatThrownBy(() -> service().darBaixa("entrega-1", authentication))
                .isInstanceOf(EntregaNaoPendenteException.class);
    }

    // --- Fluxo logístico + baixa automática ---

    @Test
    void atualizarStatusLogisticoSemControleDeFluxoHabilitadoLancaAcessoNegado() {
        Usuario usuario = usuario();
        autenticarComo(usuario);

        assertThatThrownBy(() -> service().atualizarStatusLogistico(
                "entrega-1", StatusLogisticoEntrega.EM_ROTA, null, authentication))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void marcarNaoEntregueSemObservacaoLancaExcecao() {
        Usuario usuario = usuario();
        usuario.setControleFluxoEntregaHabilitado(true);
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entregaPendente()));

        assertThatThrownBy(() -> service().atualizarStatusLogistico(
                "entrega-1", StatusLogisticoEntrega.NAO_ENTREGUE, "  ", authentication))
                .isInstanceOf(ObservacaoObrigatoriaException.class);
    }

    @Test
    void marcarEntregueComBaixaAutomaticaHabilitadaConfirmaRecebimento() {
        Usuario usuario = usuario();
        usuario.setControleFluxoEntregaHabilitado(true);
        usuario.setBaixaAutomaticaAoEntregar(true);
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        Entrega entrega = entregaPendente();
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entrega));

        service().atualizarStatusLogistico("entrega-1", StatusLogisticoEntrega.ENTREGUE, null, authentication);

        assertThat(entrega.getStatus()).isEqualTo(StatusRecebimento.RECEBIDO);
    }

    @Test
    void marcarEntregueSemBaixaAutomaticaMantemPendente() {
        Usuario usuario = usuario();
        usuario.setControleFluxoEntregaHabilitado(true);
        // baixaAutomaticaAoEntregar continua false (padrão) — precisa opt-in.
        autenticarComo(usuario);
        mockMotoboyDoTenant();
        Entrega entrega = entregaPendente();
        when(entregaRepo.findById("entrega-1")).thenReturn(Optional.of(entrega));

        service().atualizarStatusLogistico("entrega-1", StatusLogisticoEntrega.ENTREGUE, null, authentication);

        assertThat(entrega.getStatus()).isEqualTo(StatusRecebimento.PENDENTE);
    }

    private static Entrega entregaPendente() {
        Entrega entrega = new Entrega();
        entrega.setId("entrega-1");
        entrega.setMotoboyId(MOTOBOY_ID);
        entrega.setFormaPagamento(FormaPagamento.DINHEIRO);
        entrega.setStatus(StatusRecebimento.PENDENTE);
        entrega.setValue(10.0);
        return entrega;
    }

    // Pequeno helper pra capturar a Entrega passada a entregaRepo.save(...)
    // sem precisar de um ArgumentCaptor em cada teste que só quer ler o
    // objeto que foi de fato persistido.
    private static class EntregaSalvaCaptor {
        private final EntregaRepo entregaRepo;

        EntregaSalvaCaptor(EntregaRepo entregaRepo) {
            this.entregaRepo = entregaRepo;
        }

        Entrega ultimaEntregaSalva() {
            org.mockito.ArgumentCaptor<Entrega> captor = org.mockito.ArgumentCaptor.forClass(Entrega.class);
            verify(entregaRepo).save(captor.capture());
            return captor.getValue();
        }
    }
}
