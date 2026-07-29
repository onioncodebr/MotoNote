import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { getEntregasPorStatusLogistico, atualizarStatusLogisticoEntrega, atualizarStatusLogisticoEmMassa, deleteEntrega } from '../services/api'
import { formatarData, formatarMoeda } from '../utils/format'
import { FORMA_PAGAMENTO_LABELS, STATUS_RECEBIMENTO_LABELS, STATUS_RECEBIMENTO_CLASSES } from '../utils/entregaPagamento'
import { STATUS_LOGISTICO_LABELS, STATUS_LOGISTICO_CLASSES } from '../utils/statusLogistico'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { AlterarStatusModal } from './AlterarStatusModal'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20

// Corpo da aba de um status específico (No estabelecimento/Em rota/Não foi possível
// entregar/Entregue) — vive dentro de EntregasView, que já possui o filtro
// de período/motoboy e a barra de abas (ver EntregasView.jsx). Este
// componente só cuida da lista + seleção em massa + troca de status de UM
// status por vez. Mesmas colunas de "Entregas Recentes" (pedido explícito:
// todas as abas devem ter a cara da mesma tabela), calculadas
// dinamicamente conforme as configs da conta — mesmo motivo já corrigido
// duas vezes na tabela de Clientes e em Entregas Recentes: um número fixo
// de faixas de grid quebra a linha em grupos quando o total de colunas
// muda conforme a conta liga/desliga configs.
export function EntregasPendentesView({
  status, startDate, endDate, motoboyId, motoboyNameById, onAlterado,
  exigeDadosCliente, permiteVincularCliente, clienteNameById,
}) {
  const toast = useToast()
  const [entregas, setEntregas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [selecionados, setSelecionados] = useState(() => new Set())

  const [entregaEmEdicao, setEntregaEmEdicao] = useState(null)
  const [alterandoEmMassa, setAlterandoEmMassa] = useState(false)
  const [deletingEntrega, setDeletingEntrega] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      const entregasPage = await getEntregasPorStatusLogistico(status, startDate, endDate, motoboyId, pageToLoad, PAGE_SIZE)
      setEntregas(entregasPage?.content || [])
      setPageInfo({ totalPages: entregasPage?.totalPages || 0, totalElements: entregasPage?.totalElements || 0 })
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as entregas.')
    } finally {
      setIsLoading(false)
    }
  }, [status, startDate, endDate, motoboyId])

  useEffect(() => {
    setPage(0)
    setSelecionados(new Set())
  }, [status, startDate, endDate, motoboyId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const nomeMotoboy = (id) => motoboyNameById?.[id] || 'Motoboy removido'

  const todosSelecionadosNaPagina = entregas.length > 0 && entregas.every((e) => selecionados.has(e.id))

  const alternarTodos = () => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (todosSelecionadosNaPagina) {
        entregas.forEach((e) => novo.delete(e.id))
      } else {
        entregas.forEach((e) => novo.add(e.id))
      }
      return novo
    })
  }

  const alternarSelecionado = (id) => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const confirmarStatusIndividual = async (novoStatus, observacao) => {
    await atualizarStatusLogisticoEntrega(entregaEmEdicao.id, novoStatus, observacao)
    toast.success('Status atualizado.')
    setEntregaEmEdicao(null)
    const restantesNaPagina = entregas.length - 1
    if (restantesNaPagina <= 0 && page > 0) {
      setPage((p) => p - 1)
    } else {
      fetchData(page)
    }
    onAlterado?.()
  }

  const confirmarStatusEmMassa = async (novoStatus, observacao) => {
    const quantidade = selecionados.size
    await atualizarStatusLogisticoEmMassa(Array.from(selecionados), novoStatus, observacao)
    toast.success(`${quantidade} entrega(s) atualizada(s).`)
    setAlterandoEmMassa(false)
    setSelecionados(new Set())
    // Mesmo padrão de "dar baixa em massa" em Valores Pendentes: volta pra
    // primeira página e recarrega, em vez de tentar prever quantos itens
    // ainda restam na página atual.
    setPage(0)
    fetchData(0)
    onAlterado?.()
  }

  const requestDelete = (entrega) => {
    setDeleteError('')
    setDeletingEntrega(entrega)
  }

  const confirmarDelete = async () => {
    if (!deletingEntrega) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteEntrega(deletingEntrega.id)
      toast.success('Entrega excluída.')
      setDeletingEntrega(null)
      const restantesNaPagina = entregas.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
      onAlterado?.()
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir a entrega.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Mesmas colunas de "Entregas Recentes" (ver EntregasView.jsx), na mesma
  // ordem: checkbox, Motoboy, Data, Valor, Forma de Pagamento, Valor do
  // Pedido, Cliente (texto livre) OU Cliente Vinculado, Status, Fluxo, Ações.
  // Frações (fr), não px — mesmo motivo de EntregasView.jsx: a tabela se
  // adapta à largura disponível e nunca precisa de rolagem lateral.
  const colunas = [
    '36px', '1.4fr', '0.8fr', '0.8fr', '1fr', '0.9fr',
    ...(exigeDadosCliente && !permiteVincularCliente ? ['1fr'] : []),
    ...(permiteVincularCliente ? ['1fr'] : []),
    '0.9fr', '1.3fr', '1.6fr',
  ]
  const estiloColunas = { gridTemplateColumns: colunas.join(' '), columnGap: '16px' }

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
      <div className="panel-header flex flex-wrap justify-between items-start gap-3">
        <h2>{STATUS_LOGISTICO_LABELS[status]}</h2>
        {selecionados.size > 0 && (
          <Button type="button" variant="dark" size="small" onClick={() => setAlterandoEmMassa(true)}>
            Alterar status em massa ({selecionados.size})
          </Button>
        )}
      </div>
      <div className="fluxo-status-table">
        <div className="table-scroll" role="table" aria-label="Entregas por status">
          <div className="table-header" role="row" style={estiloColunas}>
            <span role="columnheader">
              <input
                type="checkbox"
                checked={todosSelecionadosNaPagina}
                onChange={alternarTodos}
                disabled={entregas.length === 0}
                aria-label="Selecionar todos os itens desta página"
              />
            </span>
            <span role="columnheader">Motoboy</span>
            <span role="columnheader">Data</span>
            <span role="columnheader">Valor</span>
            <span role="columnheader">Forma de Pagamento</span>
            <span role="columnheader">Valor do Pedido</span>
            {exigeDadosCliente && !permiteVincularCliente && <span role="columnheader">Cliente</span>}
            {permiteVincularCliente && <span role="columnheader">Cliente Vinculado</span>}
            <span role="columnheader">Status</span>
            <span role="columnheader">Fluxo</span>
            <span role="columnheader">Ações</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={colunas.length} style={estiloColunas} />)
          ) : entregas.length > 0 ? (
            entregas.map((entrega) => (
              <div className="table-row" role="row" key={entrega.id} style={estiloColunas}>
                <span role="cell">
                  <input
                    type="checkbox"
                    checked={selecionados.has(entrega.id)}
                    onChange={() => alternarSelecionado(entrega.id)}
                    aria-label={`Selecionar entrega de ${nomeMotoboy(entrega.motoboyId)}`}
                  />
                </span>
                <strong className="cell-title" role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>
                <span role="cell" data-label="Data">{formatarData(entrega.localDate)}</span>
                <span role="cell" data-label="Valor">{formatarMoeda(entrega.value)}</span>
                <span role="cell" data-label="Forma de Pagamento">{FORMA_PAGAMENTO_LABELS[entrega.formaPagamento] || '—'}</span>
                <span role="cell" data-label="Valor do Pedido">{entrega.valorPedido != null ? formatarMoeda(entrega.valorPedido) : '—'}</span>
                {exigeDadosCliente && !permiteVincularCliente && (
                  <span role="cell" data-label="Cliente">{entrega.nomeCliente || '—'}</span>
                )}
                {permiteVincularCliente && (
                  <span role="cell" data-label="Cliente Vinculado">{clienteNameById?.[entrega.clienteId] || '—'}</span>
                )}
                <span role="cell" data-label="Status">
                  {entrega.status ? (
                    <span className={STATUS_RECEBIMENTO_CLASSES[entrega.status]}>
                      {STATUS_RECEBIMENTO_LABELS[entrega.status]}
                    </span>
                  ) : '—'}
                </span>
                <span role="cell" data-label="Fluxo">
                  {entrega.statusLogistico ? (
                    <span className={STATUS_LOGISTICO_CLASSES[entrega.statusLogistico]}>
                      {STATUS_LOGISTICO_LABELS[entrega.statusLogistico]}
                    </span>
                  ) : '—'}
                </span>
                <div className="table-actions" role="cell">
                  <Button variant="outline" size="small" onClick={() => setEntregaEmEdicao(entrega)}>
                    Alterar status
                  </Button>
                  <button className="delete-button" onClick={() => requestDelete(entrega)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhuma entrega com esse status no período selecionado.</div>
          )}
        </div>
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

      <AlterarStatusModal
        isOpen={!!entregaEmEdicao}
        quantidade={1}
        onRequestClose={() => setEntregaEmEdicao(null)}
        onConfirmar={confirmarStatusIndividual}
      />
      <AlterarStatusModal
        isOpen={alterandoEmMassa}
        quantidade={selecionados.size}
        onRequestClose={() => setAlterandoEmMassa(false)}
        onConfirmar={confirmarStatusEmMassa}
      />
      <ConfirmDialog
        isOpen={!!deletingEntrega}
        title="Excluir entrega"
        message="Tem certeza que deseja excluir esta entrega? Você não pode voltar atrás depois que clicar em confirmar."
        isLoading={isDeleting}
        error={deleteError}
        onCancel={() => setDeletingEntrega(null)}
        onConfirm={confirmarDelete}
      />
    </div>
  )
}
