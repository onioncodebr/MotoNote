import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { getClientesRanking, updateCliente, deleteCliente } from '../services/api'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData, formatarEndereco } from '../utils/format'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { AddClienteModal } from './AddClienteModal'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20

// "todos" (histórico inteiro, sem filtro de data) além dos períodos comuns
// — ClienteService trata startDate/endDate ausentes como "olhar todo o
// histórico" (ver fluxo-entrega-configuracoes.md).
const PERIODOS_CLIENTES = { todos: { label: 'Todo o período' }, ...PERIODOS }

const OPCOES_ORDENACAO = [
  { value: 'nome', label: 'Nome' },
  { value: 'pedidos', label: 'Mais pedidos' },
  { value: 'gasto', label: 'Mais gastou' },
  { value: 'ticketMedio', label: 'Ticket médio' },
  { value: 'ultimaEntrega', label: 'Última entrega' },
]

// Modal largo (700px) com os campos em 2 colunas, mesmo padrão de
// AddClienteModal — cabe sem rolagem mesmo com o endereço estruturado.
function EditClienteModal({ isOpen, onRequestClose, cliente, onClienteUpdated }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [complemento, setComplemento] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setNome(cliente?.nome || '')
    setTelefone(cliente?.telefone || '')
    setRua(cliente?.rua || '')
    setNumero(cliente?.numero || '')
    setBairro(cliente?.bairro || '')
    setCidade(cliente?.cidade || '')
    setComplemento(cliente?.complemento || '')
    setError('')
  }, [cliente])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
      setError('Preencha todos os campos (complemento é opcional).')
      return
    }
    setLoading(true)
    setError('')
    try {
      const atualizado = await updateCliente(cliente.id, nome.trim(), telefone.trim(), {
        rua: rua.trim(), numero: numero.trim(), bairro: bairro.trim(), cidade: cidade.trim(),
        complemento: complemento.trim() || undefined,
      })
      onClienteUpdated(atualizado)
      onRequestClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar o cliente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Editar Cliente"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar alterações"
      submitLabelLoading="Salvando..."
      width={700}
    >
      <div className="grid grid-cols-2 gap-4">
        <label>
          Nome
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </label>
        <label>
          Telefone
          <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-[1fr_140px] gap-4">
        <label>
          Rua
          <input type="text" value={rua} onChange={(e) => setRua(e.target.value)} />
        </label>
        <label>
          Número
          <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label>
          Bairro
          <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </label>
        <label>
          Cidade
          <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </label>
      </div>
      <label>
        Complemento (opcional)
        <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
      </label>
    </FormModal>
  )
}

export function ClientesView() {
  const toast = useToast()
  const [ranking, setRanking] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  const [nomeBusca, setNomeBusca] = useState('')
  const [periodo, setPeriodo] = useState('todos')
  const [ordenar, setOrdenar] = useState('nome')
  const [direcao, setDirecao] = useState('asc')
  const [somenteSemPedidos, setSomenteSemPedidos] = useState(false)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [deletingCliente, setDeletingCliente] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      const { startDate, endDate } = periodo === 'todos' ? {} : getIntervaloPeriodo(periodo)
      const data = await getClientesRanking(pageToLoad, PAGE_SIZE, {
        nome: nomeBusca || undefined, startDate, endDate, ordenar, direcao, somenteSemPedidos,
      })
      setRanking(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os clientes.')
    } finally {
      setIsLoading(false)
    }
  }, [nomeBusca, periodo, ordenar, direcao, somenteSemPedidos])

  // Debounce simples da busca por nome — evita disparar uma request a cada
  // tecla digitada.
  const [nomeInput, setNomeInput] = useState('')
  useEffect(() => {
    const timeout = setTimeout(() => setNomeBusca(nomeInput), 300)
    return () => clearTimeout(timeout)
  }, [nomeInput])

  useEffect(() => {
    setPage(0)
  }, [nomeBusca, periodo, ordenar, direcao, somenteSemPedidos])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const handleClienteAdded = (novoCliente) => {
    toast.success(`Cliente "${novoCliente.nome}" adicionado.`)
    fetchData(page)
  }

  const handleClienteUpdated = () => {
    toast.success('Cliente atualizado.')
    fetchData(page)
  }

  const requestDelete = (cliente) => {
    setDeleteError('')
    setDeletingCliente(cliente)
  }

  const confirmDelete = async () => {
    if (!deletingCliente) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteCliente(deletingCliente.id)
      toast.success('Cliente excluído.')
      setDeletingCliente(null)
      const restantesNaPagina = ranking.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir o cliente.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="clientes-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Clientes</strong>
          <span>Cadastre clientes e acompanhe quem mais pede e quem mais gasta.</span>
        </div>
        <div className="flex flex-wrap gap-[10px] max-[650px]:w-full">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {Object.entries(PERIODOS_CLIENTES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)}>
            {OPCOES_ORDENACAO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={direcao} onChange={(e) => setDirecao(e.target.value)}>
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
          <Button variant="dark" size="small" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Adicionar Cliente</Button>
        </div>
      </div>

      {/* Caixa de pesquisa em destaque, numa linha própria acima dos
          filtros — pedido explícito, separada do resto pra ficar mais
          proeminente. Estilo explícito porque este input não está dentro
          de nenhum dos contêineres que já dão estilo (.delivery-form/
          .modal-form/.filters-form) — sem isso ficava com a cara crua do
          navegador, destoando do resto do app. */}
      <div className="relative mb-[14px]">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dash-text-faint)] pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar cliente por nome ou telefone..."
          value={nomeInput}
          onChange={(e) => setNomeInput(e.target.value)}
          className="w-full pl-12 pr-4 py-[13px] rounded-[var(--radius-sm)] border border-[var(--dash-border)] bg-[var(--dash-input-bg)] text-[var(--dash-text-strong)] text-[length:var(--fs-base)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--brand-focus-border)] focus:shadow-[0_0_0_3px_var(--brand-focus-ring)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-[14px] mb-[14px]">
        <label className="terms-check">
          <input type="checkbox" checked={somenteSemPedidos} onChange={(e) => setSomenteSemPedidos(e.target.checked)} />
          <span>Somente sem nenhum pedido</span>
        </label>
      </div>

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] clientes-table">
        <div className="table-scroll" role="table" aria-label="Clientes">
          <div className="table-header" role="row">
            <span role="columnheader">Nome</span>
            <span role="columnheader">Telefone</span>
            <span role="columnheader">Endereço</span>
            <span role="columnheader">Pedidos</span>
            <span role="columnheader">Total Gasto</span>
            <span role="columnheader">Ticket Médio</span>
            <span role="columnheader">Última Entrega</span>
            <span role="columnheader">Ações</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={8} />)
          ) : ranking.length > 0 ? (
            ranking.map((item) => (
              <div className="table-row" role="row" key={item.cliente.id}>
                <strong className="cell-title" role="cell">{item.cliente.nome}</strong>
                <span role="cell" data-label="Telefone">{item.cliente.telefone || '—'}</span>
                <span role="cell" data-label="Endereço">{formatarEndereco(item.cliente)}</span>
                <span role="cell" data-label="Pedidos">{item.quantidadePedidos}</span>
                <span role="cell" data-label="Total Gasto">{formatarMoeda(item.totalGasto)}</span>
                <span role="cell" data-label="Ticket Médio">{item.ticketMedio != null ? formatarMoeda(item.ticketMedio) : '—'}</span>
                <span role="cell" data-label="Última Entrega">{item.ultimaEntregaEm ? formatarData(item.ultimaEntregaEm) : '—'}</span>
                <div className="table-actions" role="cell">
                  <button onClick={() => setEditingCliente(item.cliente)}><Pencil size={14} /> Editar</button>
                  <button className="delete-button" onClick={() => requestDelete(item.cliente)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhum cliente cadastrado.</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-[14px] pt-[14px] border-t border-[var(--dash-border-soft)] text-[var(--dash-text-faint)] text-[length:var(--fs-xs)]">
            <Button type="button" variant="outline" size="small" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
              <ChevronLeft size={14} /> Anterior
            </Button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <Button type="button" variant="outline" size="small" onClick={() => setPage((p) => Math.min(p + 1, pageInfo.totalPages - 1))} disabled={page + 1 >= pageInfo.totalPages}>
              Próxima <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>

      <AddClienteModal
        isOpen={isAddModalOpen}
        onRequestClose={() => setIsAddModalOpen(false)}
        onClienteAdded={handleClienteAdded}
      />
      <EditClienteModal
        isOpen={!!editingCliente}
        onRequestClose={() => setEditingCliente(null)}
        cliente={editingCliente}
        onClienteUpdated={handleClienteUpdated}
      />
      <ConfirmDialog
        isOpen={!!deletingCliente}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir ${deletingCliente?.nome ? `"${deletingCliente.nome}"` : 'este cliente'}? Entregas já registradas com esse cliente continuam existindo. Você não pode voltar atrás depois que clicar em confirmar.`}
        isLoading={isDeleting}
        error={deleteError}
        onCancel={() => setDeletingCliente(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
