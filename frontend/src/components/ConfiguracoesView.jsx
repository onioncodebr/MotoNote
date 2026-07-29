import { useEffect, useState } from 'react'
import { LifeBuoy, BookOpen } from 'lucide-react'
import {
  getConfiguracaoExibicao, updateNome,
  atualizarModoValorPedidoObrigatorio, atualizarPermitirDadosCliente,
  atualizarControleFluxoEntrega, atualizarPermitirCadastroClientes,
  atualizarBaixaAutomaticaAoEntregar, atualizarMostrarFaturamentoPedidos,
} from '../services/api'
import { montarWhatsappUrl } from '../utils/whatsapp'
import { AlterarSenhaComCodigoPanel } from './AlterarSenhaComCodigoPanel'
import { AlterarTelefonePanel } from './AlterarTelefonePanel'
import { AparenciaPanel } from './AparenciaPanel'
import { AssinaturaView } from './AssinaturaView'
import { Button } from './Button'
import { FotoPerfilPanel } from './FotoPerfilPanel'
import { Toggle } from './Toggle'
import { useToast } from './Toast'

// onConfigDirtyChange: avisa o Dashboard (App.jsx) se há alteração não
// salva nas configurações de Entregas — usado pra mostrar um aviso antes
// de trocar de aba no menu lateral (ver Dashboard.selectView em App.jsx).
export function ConfiguracoesView({ user, onUserUpdated, theme, onToggleTheme, accentColor, onAccentChange, onComoUsar, onConfigDirtyChange }) {
  const isMaster = user?.role === 'MASTER'
  // "USER" é o papel padrão de quem assina o SaaS — não traz nenhuma
  // informação nova pra essa conta, então só mostramos o rótulo pra
  // ADMIN/MASTER, onde a distinção realmente importa.
  const mostrarRole = user?.role && user.role !== 'USER'

  const [name, setName] = useState(user?.name || '')
  const [nomeError, setNomeError] = useState('')
  const [nomeSuccess, setNomeSuccess] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  // Mesmo endpoint público que Landing/Dashboard já consultam cada um por
  // conta própria (ver App.jsx) — aqui é só pro link "Falar com o suporte".
  const [exibicao, setExibicao] = useState(null)
  useEffect(() => {
    let cancelado = false
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setExibicao(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])
  const whatsappUrl = montarWhatsappUrl(exibicao?.contatoSuporteWhatsapp)

  const salvarNome = async (e) => {
    e.preventDefault()
    setNomeError('')
    setNomeSuccess('')

    if (!name.trim()) {
      setNomeError('O nome não pode ficar em branco.')
      return
    }

    setSalvandoNome(true)
    try {
      const atualizado = await updateNome(name.trim())
      onUserUpdated?.({ name: atualizado.name })
      setNomeSuccess('Nome atualizado com sucesso.')
    } catch (requestError) {
      setNomeError(requestError.message || 'Não foi possível atualizar o nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Configurações da conta</strong>
          <span>Gerencie os dados de acesso, a assinatura e a aparência do sistema.</span>
        </div>
      </div>

      <div className="configuracoes-grid grid grid-cols-[320px_1fr] max-[1080px]:grid-cols-1 gap-[14px] mt-[14px] items-start">
        <div className="col-span-full panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2>Perfil</h2></div>
          <div className="flex gap-[28px] items-start mt-5 max-sm:flex-col max-sm:items-center">
            <FotoPerfilPanel nome={user?.name} fotoUrl={user?.fotoUrl} onUpdated={(fotoUrl) => onUserUpdated?.({ fotoUrl })} />
            <form className="delivery-form grid gap-4 mt-0 flex-[1_1_260px] max-sm:w-full" onSubmit={salvarNome}>
              <label>
                Nome
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                E-mail
                <input type="text" value={user?.email || ''} disabled />
              </label>
              {mostrarRole && (
                <label>
                  Perfil de acesso
                  <input type="text" value={user.role} disabled />
                </label>
              )}
              {nomeError && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{nomeError}</p>}
              {nomeSuccess && <p className="text-[var(--color-success)] text-[length:var(--fs-sm)] -mt-1 mb-0">{nomeSuccess}</p>}
              <Button type="submit" variant="dark" size="small" disabled={salvandoNome || name.trim() === user?.name}>
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-8 mt-6 pt-5 border-t border-[var(--dash-border)]">
            <AlterarTelefonePanel telefoneAtual={user?.phone} onConfirmed={(phone) => onUserUpdated?.({ phone })} />
            <AlterarSenhaComCodigoPanel />
          </div>
        </div>

        <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Entregas</h3>
        <EntregasConfigPanel user={user} onUserUpdated={onUserUpdated} onDirtyChange={onConfigDirtyChange} />

        {!isMaster && (
          <>
            <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Assinatura</h3>
            <div className="col-span-full">
              <AssinaturaView />
            </div>
          </>
        )}

        <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Aparência</h3>
        <AparenciaPanel theme={theme} onToggleTheme={onToggleTheme} accentColor={accentColor} onAccentChange={onAccentChange} />

        <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Ajuda</h3>
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] ajuda-card">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2><LifeBuoy size={17} /> Falar com o suporte</h2></div>
          <p>Ficou com alguma dúvida ou precisa de ajuda? Fale direto com a gente pelo WhatsApp.</p>
          <Button as="a" variant="outline" size="small" href={whatsappUrl} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </Button>
        </div>
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] ajuda-card">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2><BookOpen size={17} /> Como usar o sistema</h2></div>
          <p>Veja um guia completo de como aproveitar melhor o MotoNote no dia a dia.</p>
          <Button type="button" variant="outline" size="small" onClick={onComoUsar}>
            Ver como usar
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Configurações de Entrega (ver fluxo-entrega-configuracoes.md) — um
// bloco só, com um toggle por item e um único botão de salvar (troca do
// padrão anterior de um card+botão por item, mesmo espírito de
// ConfiguracaoGlobalView). O valor inicial vem do próprio objeto `user`
// (já viaja em getCurrentUser()/login), sem precisar de fetch separado.
// `onDirtyChange` avisa o Dashboard quando há alteração não salva, pra
// confirmar antes de trocar de aba no menu lateral (ver App.jsx).

function valoresIniciaisDe(user) {
  return {
    valorPedidoSempre: user?.modoValorPedidoObrigatorio === 'TODAS_ENTREGAS',
    dadosCliente: !!user?.permitirDadosCliente,
    fluxoEntrega: !!user?.controleFluxoEntregaHabilitado,
    cadastroClientes: !!user?.permitirCadastroClientes,
    baixaAutomatica: !!user?.baixaAutomaticaAoEntregar,
    faturamentoPedidos: !!user?.mostrarFaturamentoPedidos,
  }
}

function EntregasConfigPanel({ user, onUserUpdated, onDirtyChange }) {
  const toast = useToast()
  const iniciais = valoresIniciaisDe(user)

  const [valorPedidoSempre, setValorPedidoSempre] = useState(iniciais.valorPedidoSempre)
  const [dadosCliente, setDadosCliente] = useState(iniciais.dadosCliente)
  const [fluxoEntrega, setFluxoEntrega] = useState(iniciais.fluxoEntrega)
  const [cadastroClientes, setCadastroClientes] = useState(iniciais.cadastroClientes)
  const [baixaAutomatica, setBaixaAutomatica] = useState(iniciais.baixaAutomatica)
  const [faturamentoPedidos, setFaturamentoPedidos] = useState(iniciais.faturamentoPedidos)
  const [isSaving, setIsSaving] = useState(false)

  // Ressincroniza com os valores efetivos do usuário (ex.: depois de
  // salvar, `user` muda e este formulário reflete o novo "ponto de
  // partida" — o que também zera isDirty automaticamente abaixo).
  useEffect(() => {
    setValorPedidoSempre(iniciais.valorPedidoSempre)
    setDadosCliente(iniciais.dadosCliente)
    setFluxoEntrega(iniciais.fluxoEntrega)
    setCadastroClientes(iniciais.cadastroClientes)
    setBaixaAutomatica(iniciais.baixaAutomatica)
    setFaturamentoPedidos(iniciais.faturamentoPedidos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.modoValorPedidoObrigatorio, user?.permitirDadosCliente, user?.controleFluxoEntregaHabilitado, user?.permitirCadastroClientes, user?.baixaAutomaticaAoEntregar, user?.mostrarFaturamentoPedidos])

  const isDirty = valorPedidoSempre !== iniciais.valorPedidoSempre
    || dadosCliente !== iniciais.dadosCliente
    || fluxoEntrega !== iniciais.fluxoEntrega
    || cadastroClientes !== iniciais.cadastroClientes
    || baixaAutomatica !== iniciais.baixaAutomatica
    || faturamentoPedidos !== iniciais.faturamentoPedidos

  useEffect(() => {
    onDirtyChange?.(isDirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])
  // Ao desmontar (trocou de aba de outro jeito, ex.: logout), garante que
  // o aviso de "não salvo" não fique aceso pra sempre no Dashboard.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const modo = valorPedidoSempre ? 'TODAS_ENTREGAS' : 'SOMENTE_DINHEIRO'
      // Sequencial, não Promise.all: cada PUT faz usuarioRepo.save(usuario)
      // substituindo o documento inteiro, a partir de uma cópia do usuário
      // carregada no início DAQUELA requisição. Disparadas em paralelo,
      // as 6 chamadas carregavam o usuário quase ao mesmo tempo — a última
      // a gravar sobrescrevia o documento com o snapshot que tinha,
      // revertendo os campos que as outras já haviam mudado (só o campo
      // dela prória "pegava"). Em sequência, cada chamada só começa depois
      // que a anterior já gravou no Mongo, então não há mais snapshot
      // desatualizado disputando a escrita.
      await atualizarModoValorPedidoObrigatorio(modo)
      await atualizarPermitirDadosCliente(dadosCliente)
      await atualizarControleFluxoEntrega(fluxoEntrega)
      await atualizarPermitirCadastroClientes(cadastroClientes)
      await atualizarBaixaAutomaticaAoEntregar(baixaAutomatica)
      const resposta = await atualizarMostrarFaturamentoPedidos(faturamentoPedidos)
      onUserUpdated?.(resposta)
      toast.success('Configurações salvas.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar as configurações.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="col-span-full panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
      <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2>Entregas</h2></div>
      <form onSubmit={handleSubmit} className="mt-2">
        <Toggle
          checked={valorPedidoSempre}
          onChange={(v) => { setValorPedidoSempre(v); if (!v) setFaturamentoPedidos(false) }}
          label="Exigir valor do pedido em qualquer forma de pagamento"
          description="Desligado: só é obrigatório quando a forma de pagamento é Dinheiro."
        />
        <Toggle
          checked={faturamentoPedidos}
          onChange={(v) => { setFaturamentoPedidos(v); if (v) setValorPedidoSempre(true) }}
          label="Faturamento dos pedidos"
          description="Mostra um card na Visão Geral com a soma do valor dos pedidos no período. Torna o valor do pedido obrigatório em qualquer forma de pagamento (liga o item acima)."
        />
        <Toggle
          checked={dadosCliente}
          onChange={setDadosCliente}
          label="Nome do cliente e descrição do pedido"
          description="Quando ativado, os dois campos passam a ser obrigatórios ao registrar uma entrega."
        />
        <Toggle
          checked={fluxoEntrega}
          onChange={(v) => { setFluxoEntrega(v); if (!v) setBaixaAutomatica(false) }}
          label="Controle de fluxo da entrega"
          description='Ativa as abas de status (No estabelecimento / Em rota / Entregue / Não foi possível entregar) dentro de "Entregas".'
        />
        <Toggle
          checked={cadastroClientes}
          onChange={setCadastroClientes}
          label="Cadastro de clientes"
          description='Ativa a tela "Clientes" no menu lateral e a possibilidade de vincular um cliente cadastrado ao registrar uma entrega.'
        />
        <Toggle
          checked={baixaAutomatica}
          onChange={setBaixaAutomatica}
          disabled={!fluxoEntrega}
          label="Baixa automática ao entregar"
          description='Ao marcar uma entrega em Dinheiro como "Entregue", confirma o recebimento automaticamente (exige o controle de fluxo ativado acima).'
        />
        <Button type="submit" variant="dark" size="small" className="mt-4" disabled={isSaving || !isDirty}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
