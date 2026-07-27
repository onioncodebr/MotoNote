import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, CheckCircle2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  createVale, deleteVale, getMotoboys, getMotoboyVales, getVales, updateVale, updateValeStatus,
} from '../services/api'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { toLocalIsoDate } from '../utils/date'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData } from '../utils/format'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20

const STATUS_VALE_LABELS = { PENDENTE: 'Pendente', CONCLUIDO: 'Concluído' }
const STATUS_VALE_CLASSES = { PENDENTE: 'plan-badge warning', CONCLUIDO: 'plan-badge success' }

function hojeISO() {
  return toLocalIsoDate(new Date())
}

function ValeFormFields({ motoboys, motoboyId, setMotoboyId, descricao, setDescricao, valor, setValor, data, setData }) {
  return (
    <>
      <label>
        Motoboy
        <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)} required>
          <option value="" disabled>Selecione um motoboy</option>
          {motoboys.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
      <label>
        Descrição
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Adiantamento salário..." autoFocus />
      </label>
      <label>
        Valor (R$)
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 100.00" />
      </label>
      <label>
        Data
        <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
      </label>
    </>
  )
}

function AddValeModal({ isOpen, onRequestClose, motoboys, onValeAdded }) {
  const [motoboyId, setMotoboyId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetAndClose = () => {
    setMotoboyId('')
    setDescricao('')
    setValor('')
    setData(hojeISO())
    setError('')
    onRequestClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motoboyId || !descricao.trim() || !valor) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const novoVale = await createVale(motoboyId, descricao.trim(), parseFloat(valor), data)
      onValeAdded(novoVale)
      resetAndClose()
    } catch (err) {
      setError(err.message || 'Não foi possível adicionar o vale.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={resetAndClose}
      title="Adicionar Vale"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Adicionar Vale"
      submitLabelLoading="Adicionando..."
      width={420}
    >
      <ValeFormFields
        motoboys={motoboys}
        motoboyId={motoboyId} setMotoboyId={setMotoboyId}
        descricao={descricao} setDescricao={setDescricao}
        valor={valor} setValor={setValor}
        data={data} setData={setData}
      />
    </FormModal>
  )
}

function EditValeModal({ isOpen, onRequestClose, vale, motoboys, onValeUpdated }) {
  const [motoboyId, setMotoboyId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMotoboyId(vale?.motoboyId || '')
    setDescricao(vale?.descricao || '')
    setValor(vale?.value != null ? String(vale.value) : '')
    setData(vale?.localDate || hojeISO())
    setError('')
  }, [vale])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motoboyId || !descricao.trim() || !valor) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const updated = await updateVale(vale.id, motoboyId, descricao.trim(), parseFloat(valor), data)
      onValeUpdated(updated)
      onRequestClose()
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o vale.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Editar Vale"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar alterações"
      submitLabelLoading="Salvando..."
      width={420}
    >
      <ValeFormFields
        motoboys={motoboys}
        motoboyId={motoboyId} setMotoboyId={setMotoboyId}
        descricao={descricao} setDescricao={setDescricao}
        valor={valor} setValor={setValor}
        data={data} setData={setData}
      />
    </FormModal>
  )
}

// escopoProprio: portal do motoboy — só visualiza os próprios vales, sem
// nenhuma ação de criar/editar/excluir/mudar status. Fora dele (dono da
// conta): CRUD completo, filtrável por motoboy/período.
export function ValesView({ user, escopoProprio = false }) {
  const toast = useToast()
  const [vales, setVales] = useState([])
  const [motoboys, setMotoboys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  const [motoboyId, setMotoboyId] = useState('')
  const [periodo, setPeriodo] = useState('mes')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingVale, setEditingVale] = useState(null)
  const [deletingVale, setDeletingVale] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      setIsLoading(true)
      setError('')
      if (escopoProprio) {
        const valesPage = await getMotoboyVales(pageToLoad, PAGE_SIZE)
        setVales(valesPage?.content || [])
        setPageInfo({ totalPages: valesPage?.totalPages || 0, totalElements: valesPage?.totalElements || 0 })
      } else {
        const { startDate, endDate } = getIntervaloPeriodo(periodo)
        const [valesPage, motoboysData] = await Promise.all([
          getVales(startDate, endDate, motoboyId || undefined, pageToLoad, PAGE_SIZE),
          getMotoboys(),
        ])
        setVales(valesPage?.content || [])
        setPageInfo({ totalPages: valesPage?.totalPages || 0, totalElements: valesPage?.totalElements || 0 })
        setMotoboys(motoboysData || [])
      }
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os vales.')
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

  const handleValeAdded = () => {
    toast.success('Vale adicionado.')
    if (page === 0) fetchData(0)
    else setPage(0)
  }

  const handleValeUpdated = (updated) => {
    setVales((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
    toast.success('Vale atualizado.')
  }

  const alternarStatus = async (vale) => {
    const novoStatus = vale.status === 'PENDENTE' ? 'CONCLUIDO' : 'PENDENTE'
    try {
      const updated = await updateValeStatus(vale.id, novoStatus)
      setVales((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      toast.success(novoStatus === 'CONCLUIDO' ? 'Vale marcado como concluído.' : 'Vale reaberto como pendente.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar o status do vale.')
    }
  }

  const requestDelete = (vale) => {
    setDeleteError('')
    setDeletingVale(vale)
  }

  const confirmDelete = async () => {
    if (!deletingVale) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteVale(deletingVale.id)
      toast.success('Vale excluído.')
      setDeletingVale(null)
      const restantesNaPagina = vales.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir o vale.')
    } finally {
      setIsDeleting(false)
    }
  }

  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (id) => motoboyNameById[id] || 'Motoboy removido'

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="vales-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>{escopoProprio ? 'Meus Vales' : 'Vales'}</strong>
          <span>{escopoProprio ? 'Adiantamentos e descontos registrados em seu nome.' : 'Gerencie adiantamentos e descontos dos motoboys.'}</span>
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
            <Button variant="dark" size="small" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Adicionar Vale</Button>
          </div>
        )}
      </div>

      <div className="panel vales-panel">
        <div className={escopoProprio ? 'vales-table vales-table-leitura' : 'vales-table'}>
          <div className="table-scroll" role="table" aria-label="Vales">
            <div className="table-header" role="row">
              {!escopoProprio && <span role="columnheader">Motoboy</span>}
              <span role="columnheader">Descrição</span>
              <span role="columnheader">Data</span>
              <span role="columnheader">Valor</span>
              <span role="columnheader">Status</span>
              {!escopoProprio && <span role="columnheader">Ações</span>}
            </div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 4 : 6} />)
            ) : vales.length > 0 ? (
              vales.map((vale) => (
                <div className="table-row" role="row" key={vale.id}>
                  {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(vale.motoboyId)}</strong>}
                  <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Descrição'}>{vale.descricao}</span>
                  <span role="cell" data-label="Data">{formatarData(vale.localDate)}</span>
                  <span role="cell" data-label="Valor">{formatarMoeda(vale.value)}</span>
                  <span role="cell" data-label="Status"><span className={STATUS_VALE_CLASSES[vale.status]}>{STATUS_VALE_LABELS[vale.status]}</span></span>
                  {!escopoProprio && (
                    <div className="table-actions" role="cell">
                      <button onClick={() => alternarStatus(vale)} title={vale.status === 'PENDENTE' ? 'Marcar como concluído' : 'Reabrir como pendente'}>
                        {vale.status === 'PENDENTE' ? <CheckCircle2 size={14} /> : <RotateCcw size={14} />}
                        {vale.status === 'PENDENTE' ? ' Concluir' : ' Reabrir'}
                      </button>
                      <button onClick={() => setEditingVale(vale)}><Pencil size={14} /> Editar</button>
                      <button className="delete-button" onClick={() => requestDelete(vale)}><Trash2 size={14} /> Excluir</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state"><PackageOpen size={22} />Nenhum vale registrado.</div>
            )}
          </div>
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
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

      {!escopoProprio && (
        <>
          <AddValeModal
            isOpen={isAddModalOpen}
            onRequestClose={() => setIsAddModalOpen(false)}
            motoboys={motoboys}
            onValeAdded={handleValeAdded}
          />
          <EditValeModal
            isOpen={!!editingVale}
            onRequestClose={() => setEditingVale(null)}
            vale={editingVale}
            motoboys={motoboys}
            onValeUpdated={handleValeUpdated}
          />
          <ConfirmDialog
            isOpen={!!deletingVale}
            title="Excluir vale"
            message="Tem certeza que deseja excluir este vale? Você não pode voltar atrás depois que clicar em confirmar."
            isLoading={isDeleting}
            error={deleteError}
            onCancel={() => setDeletingVale(null)}
            onConfirm={confirmDelete}
          />
        </>
      )}
    </div>
  )
}
