import { useCallback, useEffect, useState } from 'react'
import { Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Plus, Search, X, UserRound } from 'lucide-react'
import { createEntrega, deleteEntrega, getReportPaginado, getMotoboyEntregas, getMotoboys, buscarClientes, getClientes, getContagemStatusLogistico, atualizarStatusLogisticoEntrega } from '../services/api'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { AddClienteModal } from './AddClienteModal'
import { AlterarStatusModal } from './AlterarStatusModal'
import { EntregasPendentesView } from './EntregasPendentesView'
import { toLocalIsoDate } from '../utils/date'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData } from '../utils/format'
import { FORMA_PAGAMENTO_LABELS, STATUS_RECEBIMENTO_LABELS, STATUS_RECEBIMENTO_CLASSES } from '../utils/entregaPagamento'
import { STATUS_LOGISTICO_LABELS, STATUS_LOGISTICO_CLASSES } from '../utils/statusLogistico'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'
import { PeriodoFilter } from './PeriodoFilter'

const PAGE_SIZE = 20

// "dia" fica junto dos presets de PERIODOS no mesmo <select>, mas é tratado
// à parte (ver intervaloDe) por depender de uma data digitada.
const PERIODOS_ENTREGAS = { ...PERIODOS, dia: { label: 'Dia específico' } }

// Uma aba por status do fluxo logístico, direto ao lado de "Todas as
// Entregas" — inclusive Entregue, pra dar visão completa do fluxo (não só
// "o que falta"). Usam o MESMO filtro de período/motoboy já existente na
// aba Entregas (não um filtro à parte).
const ABAS_STATUS = ['NA_LOJA', 'EM_ROTA', 'NAO_ENTREGUE', 'ENTREGUE']
const CONTAGEM_CAMPO = { NA_LOJA: 'naLoja', EM_ROTA: 'emRota', NAO_ENTREGUE: 'naoEntregue', ENTREGUE: 'entregue' }

function hojeISO() {
  return toLocalIsoDate(new Date())
}

// "dia" não é um dos períodos calculáveis de PERIODOS/getIntervaloPeriodo
// (depende da data escolhida pelo usuário), então é tratado à parte aqui.
// "personalizado" é repassado pro getIntervaloPeriodo central.
function intervaloDe(periodo, diaEspecifico, personalizado) {
  if (periodo === 'dia') {
    return { startDate: diaEspecifico, endDate: diaEspecifico }
  }
  return getIntervaloPeriodo(periodo, personalizado)
}

// escopoProprio: modo do portal do motoboy — só leitura das próprias
// entregas, sem formulário de criar e sem excluir (ver App.jsx/Dashboard).
export function EntregasView({ user, escopoProprio = false }) {
  const toast = useToast()
  const [entregas, setEntregas] = useState([])
  const [motoboys, setMotoboys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Paginação (o histórico completo pode ser grande — busca sempre por
  // página, mais recentes primeiro, em vez da lista inteira de uma vez).
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  // Filtros da lista (só dono) — por padrão mostra só hoje, mas dá pra
  // escolher ontem/semana/mês ou filtrar por motoboy.
  const [filtroMotoboyId, setFiltroMotoboyId] = useState('')
  const [periodo, setPeriodo] = useState('hoje')
  // "dia" é um período à parte: usa a data escolhida em diaEspecifico como
  // início E fim, em vez de ser calculado a partir de hoje (ver PERIODOS).
  const [diaEspecifico, setDiaEspecifico] = useState(hojeISO())
  const [startDatePersonalizado, setStartDatePersonalizado] = useState('')
  const [endDatePersonalizado, setEndDatePersonalizado] = useState('')

  // Sub-navegação interna: "registro" (Todas as Entregas) ou um dos 4
  // status do fluxo logístico — todos lado a lado na mesma barra, não
  // aninhados em duas camadas. Os status só aparecem quando a conta tem o
  // controle de fluxo habilitado.
  const [abaInterna, setAbaInterna] = useState('registro')
  const [contagemStatus, setContagemStatus] = useState(null)

  // State for the form
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [valor, setValor] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [valorPedido, setValorPedido] = useState('')
  const [data, setData] = useState(hojeISO())
  const [nomeCliente, setNomeCliente] = useState('')
  const [descricaoPedido, setDescricaoPedido] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingEntrega, setDeletingEntrega] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [entregaEmEdicaoStatus, setEntregaEmEdicaoStatus] = useState(null)

  // Cliente vinculado (opcional, só quando user.permitirCadastroClientes está
  // ligado) — busca por nome com debounce simples, mesmo padrão de
  // autocomplete leve (ver fluxo-entrega-configuracoes.md).
  const [clienteId, setClienteId] = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteResultados, setClienteResultados] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [isAddClienteModalOpen, setIsAddClienteModalOpen] = useState(false)

  useEffect(() => {
    if (!user?.permitirCadastroClientes || !clienteBusca.trim()) {
      setClienteResultados([])
      return undefined
    }
    let cancelado = false
    const timeout = setTimeout(() => {
      buscarClientes(clienteBusca.trim())
        .then((data) => { if (!cancelado) setClienteResultados(data || []) })
        .catch(() => {})
    }, 300)
    return () => { cancelado = true; clearTimeout(timeout) }
  }, [clienteBusca, user?.permitirCadastroClientes])

  const selecionarCliente = (cliente) => {
    setClienteId(cliente.id)
    setClienteSelecionado(cliente)
    setClienteBusca('')
    setClienteResultados([])
  }

  const handleClienteAdicionado = (novoCliente) => {
    selecionarCliente(novoCliente)
    toast.success(`Cliente "${novoCliente.nome}" adicionado.`)
  }

  // Lista completa dos clientes do tenant — só pra resolver o nome do
  // "Cliente Vinculado" na tabela (a API só devolve o clienteId na
  // entrega), mesmo papel de motoboyNameById.
  const [clientesList, setClientesList] = useState([])
  useEffect(() => {
    if (!user?.permitirCadastroClientes || escopoProprio) return
    let cancelado = false
    getClientes().then((data) => { if (!cancelado) setClientesList(data || []) }).catch(() => {})
    return () => { cancelado = true }
  }, [user?.permitirCadastroClientes, escopoProprio])
  const clienteNameById = Object.fromEntries(clientesList.map((c) => [c.id, c.nome]))

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      if (escopoProprio) {
        const entregasPage = await getMotoboyEntregas(pageToLoad, PAGE_SIZE)
        setEntregas(entregasPage?.content || [])
        setPageInfo({ totalPages: entregasPage?.totalPages || 0, totalElements: entregasPage?.totalElements || 0 })
      } else {
        const { startDate, endDate } = intervaloDe(periodo, diaEspecifico, { startDate: startDatePersonalizado, endDate: endDatePersonalizado })
        if (!startDate || !endDate) return
        const [entregasPage, motoboysData] = await Promise.all([
          getReportPaginado(startDate, endDate, filtroMotoboyId || undefined, pageToLoad, PAGE_SIZE),
          getMotoboys(),
        ])
        setEntregas(entregasPage?.content || [])
        setPageInfo({ totalPages: entregasPage?.totalPages || 0, totalElements: entregasPage?.totalElements || 0 })
        setMotoboys(motoboysData || [])
      }
    } catch (err) {
      setError('Não foi possível carregar os dados.')
    } finally {
      setIsLoading(false)
    }
  }, [escopoProprio, periodo, diaEspecifico, startDatePersonalizado, endDatePersonalizado, filtroMotoboyId])

  // Zera a página ao trocar de modo (dono <-> motoboy) ou de filtro — evita
  // pedir uma página que pode nem existir no novo escopo/período.
  useEffect(() => {
    setPage(0)
  }, [escopoProprio, periodo, diaEspecifico, startDatePersonalizado, endDatePersonalizado, filtroMotoboyId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  // Contagem por status (badge de cada aba) — mesmo período/motoboy já
  // filtrado na tela, recarregada também depois de qualquer alteração de
  // status (individual ou em massa, ver onAlterado abaixo).
  const fetchContagem = useCallback(() => {
    if (escopoProprio || !user?.controleFluxoEntregaHabilitado) return
    const { startDate, endDate } = intervaloDe(periodo, diaEspecifico, { startDate: startDatePersonalizado, endDate: endDatePersonalizado })
    if (!startDate || !endDate) return
    getContagemStatusLogistico(startDate, endDate, filtroMotoboyId || undefined)
      .then(setContagemStatus)
      .catch(() => {})
  }, [escopoProprio, user?.controleFluxoEntregaHabilitado, periodo, diaEspecifico, startDatePersonalizado, endDatePersonalizado, filtroMotoboyId])

  useEffect(() => {
    fetchContagem()
  }, [fetchContagem])

  const isDinheiro = formaPagamento === 'DINHEIRO'
  // Valor do pedido é obrigatório em Dinheiro ou, se a conta configurou
  // assim, em qualquer forma de pagamento (ver painel "Valor do pedido
  // obrigatório" em Configurações).
  const exigeValorPedido = isDinheiro || user?.modoValorPedidoObrigatorio === 'TODAS_ENTREGAS' || !!user?.mostrarFaturamentoPedidos
  const exigeDadosCliente = !!user?.permitirDadosCliente
  const permiteVincularCliente = !!user?.permitirCadastroClientes

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMotoboy || !valor || !formaPagamento) {
      setFormError('Todos os campos são obrigatórios.')
      return
    }
    if (exigeValorPedido && !valorPedido) {
      setFormError('O valor do pedido é obrigatório' + (isDinheiro ? ' quando a forma de pagamento é Dinheiro.' : '.'))
      return
    }
    if (valorPedido && parseFloat(valorPedido) <= parseFloat(valor)) {
      setFormError('O valor do pedido deve ser maior que o valor da entrega.')
      return
    }
    // Quando dá pra vincular um Cliente cadastrado, o campo "Cliente"
    // substitui o texto livre de "Nome do Cliente" — a obrigatoriedade de
    // nome do cliente vira "precisa ter um cliente selecionado", em vez de
    // um texto digitado à parte.
    if (exigeDadosCliente && permiteVincularCliente && !clienteSelecionado) {
      setFormError('Selecione ou cadastre um cliente.')
      return
    }
    if (exigeDadosCliente && !permiteVincularCliente && !nomeCliente.trim()) {
      setFormError('O nome do cliente é obrigatório.')
      return
    }
    if (exigeDadosCliente && !descricaoPedido.trim()) {
      setFormError('A descrição do pedido é obrigatória.')
      return
    }
    setIsSubmitting(true)
    setFormError('')

    const nomeClienteParaEnviar = exigeDadosCliente
      ? (permiteVincularCliente ? clienteSelecionado?.nome : nomeCliente.trim())
      : undefined

    try {
      await createEntrega(
        parseFloat(valor), selectedMotoboy, data, formaPagamento,
        valorPedido ? parseFloat(valorPedido) : undefined,
        nomeClienteParaEnviar,
        exigeDadosCliente ? descricaoPedido.trim() : undefined,
        clienteId || undefined,
      )
      setValor('')
      setFormaPagamento('')
      setValorPedido('')
      setNomeCliente('')
      setDescricaoPedido('')
      setClienteId('')
      setClienteSelecionado(null)
      toast.success('Entrega registrada.')
      // A entrega nova é a mais recente (lista ordenada por data desc) —
      // volta pra primeira página pra ela aparecer.
      if (page === 0) {
        fetchData(0)
      } else {
        setPage(0)
      }
      // A entrega nasce em NA_LOJA (se o fluxo estiver habilitado) — a
      // contagem da aba precisa refletir isso na hora, sem esperar o
      // usuário trocar de filtro pra disparar um refetch.
      fetchContagem()
    } catch (err) {
      setFormError(err.message || 'Erro ao registrar entrega.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestDelete = (entrega) => {
    setDeleteError('')
    setDeletingEntrega(entrega)
  }

  const confirmDelete = async () => {
    if (!deletingEntrega) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteEntrega(deletingEntrega.id)
      toast.success('Entrega excluída.')
      setDeletingEntrega(null)
      // Se era o último item da página (e não a primeira), volta uma
      // página; senão só recarrega a atual pra puxar o próximo item.
      const restantesNaPagina = entregas.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
      fetchContagem()
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir a entrega.')
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmarStatusEntrega = async (novoStatus, observacao) => {
    await atualizarStatusLogisticoEntrega(entregaEmEdicaoStatus.id, novoStatus, observacao)
    toast.success('Status atualizado.')
    setEntregaEmEdicaoStatus(null)
    fetchData(page)
    fetchContagem()
  }

  // A API não retorna o nome do motoboy junto da entrega (só motoboyId),
  // então resolvemos o nome localmente a partir da lista de motoboys já carregada.
  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (motoboyId) => motoboyNameById[motoboyId] || 'Motoboy removido'

  // Colunas da tabela "Entregas Recentes" mudam conforme as configs da
  // conta (Cliente/Cliente Vinculado/Fluxo são condicionais) — o CSS de
  // .deliveries-table tem um número fixo de faixas (7), então com colunas
  // extras a grade quebrava em grupos, cada linha "pulando" pra baixo no
  // meio dos dados (mesmo bug já corrigido na tabela de Clientes). Calcular
  // o grid-template-columns em JS, na mesma ordem das colunas renderizadas
  // abaixo, resolve pra qualquer combinação de configs.
  // Frações (fr), não px: colunas em fr sempre somam exatamente a largura
  // do contêiner — a tabela se adapta e nunca precisa de rolagem lateral,
  // diferente de px fixo (que ou sobra ou estoura, dependendo da tela).
  // min-width:0 nas células (ver .deliveries-table em App.css) permite a
  // faixa encolher abaixo do conteúdo; o texto trunca com "…" em vez de
  // vazar por cima da coluna vizinha.
  const colunasEntregas = escopoProprio
    ? ['1fr', '1fr']
    : [
        '1.4fr', '0.8fr', '0.8fr', '1fr', '0.9fr',
        ...(exigeDadosCliente && !permiteVincularCliente ? ['1fr'] : []),
        ...(permiteVincularCliente ? ['1fr'] : []),
        '0.9fr',
        ...(user?.controleFluxoEntregaHabilitado ? ['1.3fr'] : []),
        user?.controleFluxoEntregaHabilitado ? '1.6fr' : '0.9fr',
      ]
  const estiloColunasEntregas = { gridTemplateColumns: colunasEntregas.join(' '), columnGap: '16px' }
  const intervaloAtual = intervaloDe(periodo, diaEspecifico, { startDate: startDatePersonalizado, endDate: endDatePersonalizado })

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div>
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>{escopoProprio ? 'Minhas Entregas' : 'Registro de Entregas'}</strong>
          <span>{escopoProprio ? 'Veja o histórico das suas entregas.' : 'Adicione e gerencie as entregas do dia.'}</span>
        </div>
        {!escopoProprio && (
          <div className="flex flex-wrap gap-[10px] max-[650px]:w-full">
            <select value={filtroMotoboyId} onChange={(e) => setFiltroMotoboyId(e.target.value)}>
              <option value="">Todos os motoboys</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <PeriodoFilter
              periodos={PERIODOS_ENTREGAS}
              value={periodo}
              onChange={setPeriodo}
              startDate={startDatePersonalizado}
              endDate={endDatePersonalizado}
              onStartDateChange={setStartDatePersonalizado}
              onEndDateChange={setEndDatePersonalizado}
            />
            {periodo === 'dia' && (
              <input
                type="date"
                value={diaEspecifico}
                onChange={(e) => setDiaEspecifico(e.target.value)}
                aria-label="Dia específico"
                title="Dia específico"
              />
            )}
          </div>
        )}
      </div>

      {/* Bloco de adicionar entrega — largura total, sempre no topo. */}
      {!escopoProprio && (
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] register-delivery-panel">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3">
            <h2>Adicionar Nova Entrega</h2>
          </div>
          <form className="delivery-form grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 items-start" onSubmit={handleSubmit}>
            <label>
              Motoboy
              <select value={selectedMotoboy} onChange={(e) => setSelectedMotoboy(e.target.value)} required>
                <option value="" disabled>Selecione um motoboy</option>
                {motoboys.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label>
              Valor da Entrega (R$)
              <input type="number" step="0.01" placeholder="Ex: 25.50" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </label>
            <label>
              Forma de Pagamento
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} required>
                <option value="" disabled>Selecione a forma de pagamento</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </label>
            <label>
              Valor do Pedido (R$){!exigeValorPedido && ' (opcional)'}
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 45.00"
                value={valorPedido}
                onChange={(e) => setValorPedido(e.target.value)}
                required={exigeValorPedido}
              />
            </label>
            <label>
              Data da Entrega
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </label>
            {/* Com permiteVincularCliente, o campo "Cliente" abaixo substitui
                o texto livre de nome — não faz sentido pedir os dois. */}
            {exigeDadosCliente && !permiteVincularCliente && (
              <label>
                Nome do Cliente
                <input type="text" placeholder="Ex: Maria Souza" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required />
              </label>
            )}
            {exigeDadosCliente && (
              <label>
                Descrição do Pedido
                <input type="text" placeholder="Ex: 1 pizza grande + refrigerante" value={descricaoPedido} onChange={(e) => setDescricaoPedido(e.target.value)} required />
              </label>
            )}
            {permiteVincularCliente && (
              <label className="relative">
                {exigeDadosCliente ? 'Cliente' : 'Cliente cadastrado (opcional)'}
                {clienteSelecionado ? (
                  <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-[var(--radius-sm)] border border-[var(--dash-border)] bg-[var(--dash-muted-bg)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 grid place-items-center w-8 h-8 rounded-full bg-[var(--dash-surface)] text-[var(--dash-text-faint)]">
                        <UserRound size={16} />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <strong className="text-[var(--dash-text-strong)] text-[length:var(--fs-sm)] truncate">{clienteSelecionado.nome}</strong>
                        {clienteSelecionado.telefone && (
                          <span className="text-[var(--dash-text-faint)] text-[length:var(--fs-xs)] truncate">{clienteSelecionado.telefone}</span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="flex-shrink-0 grid place-items-center w-7 h-7 rounded-full text-[var(--dash-text-faint)] hover:text-[var(--color-danger)] hover:bg-[var(--dash-surface)]"
                      onClick={() => { setClienteId(''); setClienteSelecionado(null) }}
                      aria-label="Remover cliente selecionado"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nome ou telefone..."
                        value={clienteBusca}
                        onChange={(e) => setClienteBusca(e.target.value)}
                        className="w-full !pl-10"
                      />
                    </div>
                    {clienteResultados.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-[240px] overflow-y-auto panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-md)]">
                        {clienteResultados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full flex items-center gap-2 text-left py-2 px-2 rounded-[var(--radius-sm)] hover:bg-[var(--dash-muted-bg)]"
                            onClick={() => selecionarCliente(c)}
                          >
                            <UserRound size={15} className="flex-shrink-0 text-[var(--dash-text-faint)]" />
                            <span className="flex flex-col min-w-0">
                              <span className="text-[var(--dash-text-strong)] text-[length:var(--fs-sm)] truncate">{c.nome}</span>
                              {c.telefone && <span className="text-[var(--dash-text-faint)] text-[length:var(--fs-xs)] truncate">{c.telefone}</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {/* Botão de cadastro rápido sempre abaixo do campo de busca. */}
                <button type="button" className="mt-2 inline-flex items-center gap-1 text-[length:var(--fs-sm)]" onClick={() => setIsAddClienteModalOpen(true)}>
                  <Plus size={14} /> Cadastrar novo cliente
                </button>
              </label>
            )}
            {formError && <p className="col-span-full text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{formError}</p>}
            <Button type="submit" variant="dark" full className="col-span-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
            </Button>
          </form>
        </div>
      )}

      {/* Sub-navegação: status do fluxo logístico direto ao lado de "Todas
          as Entregas" (não aninhados em duas camadas) — só aparece com a
          config ligada (ver Configurações > Entregas). */}
      {!escopoProprio && user?.controleFluxoEntregaHabilitado && (
        <div className="flex flex-wrap gap-[10px] mt-[14px] mb-[14px]">
          <Button
            type="button"
            variant={abaInterna === 'registro' ? 'dark' : 'outline'}
            size="small"
            className="!rounded-[var(--radius-md)]"
            onClick={() => setAbaInterna('registro')}
          >
            Todas as Entregas
          </Button>
          {ABAS_STATUS.map((status) => (
            <Button
              key={status}
              type="button"
              variant={abaInterna === status ? 'dark' : 'outline'}
              size="small"
              className="!rounded-[var(--radius-md)]"
              onClick={() => setAbaInterna(status)}
            >
              {STATUS_LOGISTICO_LABELS[status]} ({contagemStatus ? contagemStatus[CONTAGEM_CAMPO[status]] ?? 0 : 0})
            </Button>
          ))}
        </div>
      )}

      {!escopoProprio && abaInterna !== 'registro' ? (
        <EntregasPendentesView
          status={abaInterna}
          startDate={intervaloAtual.startDate}
          endDate={intervaloAtual.endDate}
          motoboyId={filtroMotoboyId || undefined}
          motoboyNameById={motoboyNameById}
          onAlterado={fetchContagem}
          exigeDadosCliente={exigeDadosCliente}
          permiteVincularCliente={permiteVincularCliente}
          clienteNameById={clienteNameById}
        />
      ) : (
      <div className="mt-[14px]">
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] recent-deliveries-panel">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3">
            <h2>{escopoProprio ? 'Entregas' : 'Entregas Recentes'}</h2>
          </div>
          <div className={escopoProprio ? 'deliveries-table deliveries-table-leitura' : 'deliveries-table'}>
            <div className="table-scroll" role="table" aria-label="Entregas">
              <div className="table-header" role="row" style={estiloColunasEntregas}>
                {!escopoProprio && <span role="columnheader">Motoboy</span>}
                <span role="columnheader">Data</span>
                <span role="columnheader">Valor</span>
                {!escopoProprio && <span role="columnheader">Forma de Pagamento</span>}
                {!escopoProprio && <span role="columnheader">Valor do Pedido</span>}
                {/* Com permiteVincularCliente, "Cliente Vinculado" já cobre o
                    nome (nomeCliente é derivado do cliente selecionado) —
                    mostrar os dois seria redundante. */}
                {!escopoProprio && exigeDadosCliente && !permiteVincularCliente && <span role="columnheader">Cliente</span>}
                {!escopoProprio && permiteVincularCliente && <span role="columnheader">Cliente Vinculado</span>}
                {!escopoProprio && <span role="columnheader">Status</span>}
                {!escopoProprio && user?.controleFluxoEntregaHabilitado && <span role="columnheader">Fluxo</span>}
                {!escopoProprio && <span role="columnheader">Ações</span>}
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 2 : colunasEntregas.length} style={estiloColunasEntregas} />)
              ) : entregas.length > 0 ? (
                entregas.map((entrega) => (
                  <div className="table-row" role="row" key={entrega.id} style={estiloColunasEntregas}>
                    {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>}
                    <span role="cell" data-label="Data">{formatarData(entrega.localDate)}</span>
                    <span role="cell" data-label="Valor">{formatarMoeda(entrega.value)}</span>
                    {!escopoProprio && (
                      <span role="cell" data-label="Forma de Pagamento">{FORMA_PAGAMENTO_LABELS[entrega.formaPagamento] || '—'}</span>
                    )}
                    {!escopoProprio && (
                      <span role="cell" data-label="Valor do Pedido">{entrega.valorPedido != null ? formatarMoeda(entrega.valorPedido) : '—'}</span>
                    )}
                    {!escopoProprio && exigeDadosCliente && !permiteVincularCliente && (
                      <span role="cell" data-label="Cliente">{entrega.nomeCliente || '—'}</span>
                    )}
                    {!escopoProprio && permiteVincularCliente && (
                      <span role="cell" data-label="Cliente Vinculado">{clienteNameById[entrega.clienteId] || '—'}</span>
                    )}
                    {!escopoProprio && (
                      <span role="cell" data-label="Status">
                        {entrega.status ? (
                          <span className={STATUS_RECEBIMENTO_CLASSES[entrega.status]}>
                            {STATUS_RECEBIMENTO_LABELS[entrega.status]}
                          </span>
                        ) : '—'}
                      </span>
                    )}
                    {!escopoProprio && user?.controleFluxoEntregaHabilitado && (
                      <span role="cell" data-label="Fluxo">
                        {entrega.statusLogistico ? (
                          <span className={STATUS_LOGISTICO_CLASSES[entrega.statusLogistico]}>
                            {STATUS_LOGISTICO_LABELS[entrega.statusLogistico]}
                          </span>
                        ) : '—'}
                      </span>
                    )}
                    {!escopoProprio && (
                      <div className="table-actions" role="cell">
                        {user?.controleFluxoEntregaHabilitado && (
                          <Button variant="outline" size="small" onClick={() => setEntregaEmEdicaoStatus(entrega)}>
                            Alterar status
                          </Button>
                        )}
                        <button className="delete-button" onClick={() => requestDelete(entrega)}><Trash2 size={14} /> Excluir</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhuma entrega registrada.</div>
              )}
            </div>
          </div>
          {!isLoading && pageInfo.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 mt-[14px] pt-[14px] border-t border-[var(--dash-border-soft)] text-[var(--dash-text-faint)] text-[length:var(--fs-xs)]">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
              >
                <ChevronLeft size={14} /> Anterior
              </Button>
              <span>Página {page + 1} de {pageInfo.totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => setPage((p) => Math.min(p + 1, pageInfo.totalPages - 1))}
                disabled={page + 1 >= pageInfo.totalPages}
              >
                Próxima <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
      {!escopoProprio && (
        <ConfirmDialog
          isOpen={!!deletingEntrega}
          title="Excluir entrega"
          message="Tem certeza que deseja excluir esta entrega? Você não pode voltar atrás depois que clicar em confirmar."
          isLoading={isDeleting}
          error={deleteError}
          onCancel={() => setDeletingEntrega(null)}
          onConfirm={confirmDelete}
        />
      )}
      {!escopoProprio && permiteVincularCliente && (
        <AddClienteModal
          isOpen={isAddClienteModalOpen}
          onRequestClose={() => setIsAddClienteModalOpen(false)}
          onClienteAdded={handleClienteAdicionado}
        />
      )}
      {!escopoProprio && user?.controleFluxoEntregaHabilitado && (
        <AlterarStatusModal
          isOpen={!!entregaEmEdicaoStatus}
          quantidade={1}
          onRequestClose={() => setEntregaEmEdicaoStatus(null)}
          onConfirmar={confirmarStatusEntrega}
        />
      )}
    </div>
  )
}
