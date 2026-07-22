import { useCallback, useEffect, useState } from 'react'
import { Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { createEntrega, deleteEntrega, getEntregas, getMotoboyEntregas, getMotoboys } from '../services/api'
import { ConfirmDialog } from './ConfirmDialog'
import { toLocalIsoDate } from '../utils/date'
import { formatarMoeda, formatarData } from '../utils/format'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20

function hojeISO() {
  return toLocalIsoDate(new Date())
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

  // State for the form
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingEntrega, setDeletingEntrega] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      if (escopoProprio) {
        const entregasPage = await getMotoboyEntregas(pageToLoad, PAGE_SIZE)
        setEntregas(entregasPage?.content || [])
        setPageInfo({ totalPages: entregasPage?.totalPages || 0, totalElements: entregasPage?.totalElements || 0 })
      } else {
        const [entregasPage, motoboysData] = await Promise.all([
          getEntregas(pageToLoad, PAGE_SIZE),
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
  }, [escopoProprio])

  // Zera a página ao trocar de modo (dono <-> motoboy) — evita pedir uma
  // página que pode nem existir no novo escopo.
  useEffect(() => {
    setPage(0)
  }, [escopoProprio])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMotoboy || !valor) {
      setFormError('Todos os campos são obrigatórios.')
      return
    }
    setIsSubmitting(true)
    setFormError('')

    try {
      await createEntrega(parseFloat(valor), selectedMotoboy, data)
      setValor('')
      setData(hojeISO())
      toast.success('Entrega registrada.')
      // A entrega nova é a mais recente (lista ordenada por data desc) —
      // volta pra primeira página pra ela aparecer.
      if (page === 0) {
        fetchData(0)
      } else {
        setPage(0)
      }
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
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir a entrega.')
    } finally {
      setIsDeleting(false)
    }
  }

  // A API não retorna o nome do motoboy junto da entrega (só motoboyId),
  // então resolvemos o nome localmente a partir da lista de motoboys já carregada.
  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (motoboyId) => motoboyNameById[motoboyId] || 'Motoboy removido'

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="entregas-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>{escopoProprio ? 'Minhas Entregas' : 'Registro de Entregas'}</strong>
          <span>{escopoProprio ? 'Veja o histórico das suas entregas.' : 'Adicione e gerencie as entregas do dia.'}</span>
        </div>
      </div>

      <div className={escopoProprio ? undefined : 'view-content-grid'}>
        {!escopoProprio && (
          <div className="panel register-delivery-panel">
            <div className="panel-header">
              <h2>Adicionar Nova Entrega</h2>
            </div>
            <form className="delivery-form" onSubmit={handleSubmit}>
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
                Data da Entrega
                <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} required />
              </label>
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="button button-dark full-button" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
              </button>
            </form>
          </div>
        )}

        <div className="panel recent-deliveries-panel">
          <div className="panel-header">
            <h2>{escopoProprio ? 'Entregas' : 'Entregas Recentes'}</h2>
          </div>
          <div className={escopoProprio ? 'deliveries-table deliveries-table-leitura' : 'deliveries-table'}>
            <div className="table-scroll" role="table" aria-label="Entregas">
              <div className="table-header" role="row">
                {!escopoProprio && <span role="columnheader">Motoboy</span>}
                <span role="columnheader">Data</span>
                <span role="columnheader">Valor</span>
                {!escopoProprio && <span role="columnheader">Ações</span>}
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 2 : 4} />)
              ) : entregas.length > 0 ? (
                entregas.map((entrega) => (
                  <div className="table-row" role="row" key={entrega.id}>
                    {!escopoProprio && <strong role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>}
                    <span role="cell">{formatarData(entrega.localDate)}</span>
                    <span role="cell">{formatarMoeda(entrega.value)}</span>
                    {!escopoProprio && (
                      <div className="table-actions" role="cell">
                        <button className="delete-button" onClick={() => requestDelete(entrega)}><Trash2 size={14} /> Excluir</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state"><PackageOpen size={22} />Nenhuma entrega registrada.</div>
              )}
            </div>
          </div>
          {!isLoading && pageInfo.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="button button-outline small-button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span>Página {page + 1} de {pageInfo.totalPages}</span>
              <button
                type="button"
                className="button button-outline small-button"
                onClick={() => setPage((p) => Math.min(p + 1, pageInfo.totalPages - 1))}
                disabled={page + 1 >= pageInfo.totalPages}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
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
    </div>
  )
}
