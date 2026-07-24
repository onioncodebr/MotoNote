import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { createGasto, deleteGasto, getGastos, getMotoboyGastos, getMotoboys, updateGasto } from '../services/api'
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { toLocalIsoDate } from '../utils/date'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData } from '../utils/format'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20

function hojeISO() {
  return toLocalIsoDate(new Date())
}

function EditGastoModal({ isOpen, onRequestClose, gasto, onGastoUpdated }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDescricao(gasto?.descricao || '')
    setValor(gasto?.value != null ? String(gasto.value) : '')
    setData(gasto?.localDate || hojeISO())
    setError('')
  }, [gasto])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!descricao.trim() || !valor) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const updated = await updateGasto(gasto.id, descricao.trim(), parseFloat(valor), data)
      onGastoUpdated(updated)
      onRequestClose()
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o gasto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Editar Gasto"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar alterações"
      submitLabelLoading="Salvando..."
      width={400}
    >
      <label>
        Descrição
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Troca de pneu" autoFocus />
      </label>
      <label>
        Valor (R$)
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 80.00" />
      </label>
      <label>
        Data
        <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
      </label>
    </FormModal>
  )
}

// escopoProprio: portal do motoboy — cria/edita/exclui os próprios gastos.
// Fora dele (dono da conta): só visualização, filtrável por motoboy/período.
export function GastosView({ user, escopoProprio = false }) {
  const toast = useToast()
  const [gastos, setGastos] = useState([])
  const [motoboys, setMotoboys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  // Filtros (só dono)
  const [motoboyId, setMotoboyId] = useState('')
  const [periodo, setPeriodo] = useState('semana')

  // Form de adicionar (só motoboy)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingGasto, setEditingGasto] = useState(null)
  const [deletingGasto, setDeletingGasto] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      if (escopoProprio) {
        const gastosPage = await getMotoboyGastos(pageToLoad, PAGE_SIZE)
        setGastos(gastosPage?.content || [])
        setPageInfo({ totalPages: gastosPage?.totalPages || 0, totalElements: gastosPage?.totalElements || 0 })
      } else {
        const { startDate, endDate } = getIntervaloPeriodo(periodo)
        const [gastosPage, motoboysData] = await Promise.all([
          getGastos(startDate, endDate, motoboyId || undefined, pageToLoad, PAGE_SIZE),
          getMotoboys(),
        ])
        setGastos(gastosPage?.content || [])
        setPageInfo({ totalPages: gastosPage?.totalPages || 0, totalElements: gastosPage?.totalElements || 0 })
        setMotoboys(motoboysData || [])
      }
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os gastos.')
    } finally {
      setIsLoading(false)
    }
  }, [escopoProprio, periodo, motoboyId])

  useEffect(() => {
    setPage(0)
  }, [escopoProprio, periodo, motoboyId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!descricao.trim() || !valor) {
      setFormError('Todos os campos são obrigatórios.')
      return
    }
    setIsSubmitting(true)
    setFormError('')
    try {
      await createGasto(descricao.trim(), parseFloat(valor), data)
      setDescricao('')
      setValor('')
      setData(hojeISO())
      toast.success('Gasto registrado.')
      if (page === 0) {
        fetchData(0)
      } else {
        setPage(0)
      }
    } catch (err) {
      setFormError(err.message || 'Erro ao registrar gasto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGastoUpdated = (updated) => {
    setGastos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    toast.success('Gasto atualizado.')
  }

  const requestDelete = (gasto) => {
    setDeleteError('')
    setDeletingGasto(gasto)
  }

  const confirmDelete = async () => {
    if (!deletingGasto) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteGasto(deletingGasto.id)
      toast.success('Gasto excluído.')
      setDeletingGasto(null)
      const restantesNaPagina = gastos.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir o gasto.')
    } finally {
      setIsDeleting(false)
    }
  }

  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (id) => motoboyNameById[id] || 'Motoboy removido'

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="entregas-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>{escopoProprio ? 'Meus Gastos' : 'Gastos dos Motoboys'}</strong>
          <span>{escopoProprio ? 'Registre pneu, gasolina, óleo e outros gastos com a moto.' : 'Acompanhe os gastos registrados pelos motoboys.'}</span>
        </div>
        {!escopoProprio && (
          <div className="toolbar-filters">
            <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
              <option value="">Todos os motoboys</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {Object.entries(PERIODOS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={escopoProprio ? 'view-content-grid' : undefined}>
        {escopoProprio && (
          <div className="panel register-delivery-panel">
            <div className="panel-header">
              <h2>Adicionar Gasto</h2>
            </div>
            <form className="delivery-form" onSubmit={handleSubmit}>
              <label>
                Descrição
                <input type="text" placeholder="Ex: Troca de pneu, Gasolina..." value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
              </label>
              <label>
                Valor (R$)
                <input type="number" step="0.01" placeholder="Ex: 80.00" value={valor} onChange={(e) => setValor(e.target.value)} required />
              </label>
              <label>
                Data
                <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} required />
              </label>
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="button button-dark full-button" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        )}

        <div className="panel recent-deliveries-panel">
          <div className="panel-header">
            <h2>{escopoProprio ? 'Gastos Recentes' : 'Gastos'}</h2>
          </div>
          <div className="deliveries-table">
            <div className="table-scroll" role="table" aria-label="Gastos">
              <div className="table-header" role="row">
                {!escopoProprio && <span role="columnheader">Motoboy</span>}
                <span role="columnheader">Descrição</span>
                <span role="columnheader">Data</span>
                <span role="columnheader">Valor</span>
                {escopoProprio && <span role="columnheader">Ações</span>}
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 4 : 4} />)
              ) : gastos.length > 0 ? (
                gastos.map((gasto) => (
                  <div className="table-row" role="row" key={gasto.id}>
                    {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(gasto.motoboyId)}</strong>}
                    <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Descrição'}>{gasto.descricao}</span>
                    <span role="cell" data-label="Data">{formatarData(gasto.localDate)}</span>
                    <span role="cell" data-label="Valor">{formatarMoeda(gasto.value)}</span>
                    {escopoProprio && (
                      <div className="table-actions" role="cell">
                        <button onClick={() => setEditingGasto(gasto)}><Pencil size={14} /> Editar</button>
                        <button className="delete-button" onClick={() => requestDelete(gasto)}><Trash2 size={14} /> Excluir</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state"><PackageOpen size={22} />Nenhum gasto registrado.</div>
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

      {escopoProprio && (
        <>
          <EditGastoModal
            isOpen={!!editingGasto}
            onRequestClose={() => setEditingGasto(null)}
            gasto={editingGasto}
            onGastoUpdated={handleGastoUpdated}
          />
          <ConfirmDialog
            isOpen={!!deletingGasto}
            title="Excluir gasto"
            message="Tem certeza que deseja excluir este gasto? Você não pode voltar atrás depois que clicar em confirmar."
            isLoading={isDeleting}
            error={deleteError}
            onCancel={() => setDeletingGasto(null)}
            onConfirm={confirmDelete}
          />
        </>
      )}
    </div>
  )
}
