import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, CheckCircle2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  createVale, createValeParcelado, deleteVale, getMotoboys, getMotoboyVales, getVales, updateVale, updateValeStatus,
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

function MotoboyDescricaoFields({ motoboys, motoboyId, setMotoboyId, descricao, setDescricao }) {
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
    </>
  )
}

function ValeFormFields({ motoboys, motoboyId, setMotoboyId, descricao, setDescricao, valor, setValor, data, setData }) {
  return (
    <>
      <MotoboyDescricaoFields motoboys={motoboys} motoboyId={motoboyId} setMotoboyId={setMotoboyId} descricao={descricao} setDescricao={setDescricao} />
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

function parcelaVazia() {
  return { valor: '', data: hojeISO() }
}

// Cada parcela tem valor e data digitados um a um (sem divisão automática
// de um total) — vira, no fim, uma lista de N vales independentes.
function ParcelasFields({ parcelas, setParcelas }) {
  const atualizarParcela = (i, campo, valorCampo) => {
    setParcelas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valorCampo } : p)))
  }
  const adicionarParcela = () => setParcelas((prev) => [...prev, parcelaVazia()])
  const removerParcela = (i) => setParcelas((prev) => prev.filter((_, idx) => idx !== i))
  const total = parcelas.reduce((soma, p) => soma + (parseFloat(p.valor) || 0), 0)

  return (
    <div className="grid gap-[10px]">
      {parcelas.map((p, i) => (
        <div key={i} className="flex gap-[8px] items-end">
          <label className="flex-1 mb-0">
            {i === 0 ? 'Valor (R$)' : `Parcela ${i + 1} — valor`}
            <input type="number" step="0.01" value={p.valor} onChange={(e) => atualizarParcela(i, 'valor', e.target.value)} placeholder="Ex: 100.00" />
          </label>
          <label className="flex-1 mb-0">
            {i === 0 ? 'Data' : 'Data'}
            <input type="date" value={p.data} onChange={(e) => atualizarParcela(i, 'data', e.target.value)} />
          </label>
          <button
            type="button"
            className="delete-button"
            onClick={() => removerParcela(i)}
            disabled={parcelas.length <= 2}
            title="Remover parcela"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="small" onClick={adicionarParcela}>
        <Plus size={14} /> Adicionar parcela
      </Button>
      <div className="flex justify-between text-[length:var(--fs-sm)] text-[var(--dash-text-faint)] pt-[6px] border-t border-[var(--dash-border-soft)]">
        <span>Total das parcelas</span>
        <strong className="text-[var(--dash-text-strong)]">{formatarMoeda(total)}</strong>
      </div>
    </div>
  )
}

function AddValeModal({ isOpen, onRequestClose, motoboys, onValeAdded }) {
  const [motoboyId, setMotoboyId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [parcelando, setParcelando] = useState(false)
  const [parcelas, setParcelas] = useState(() => [parcelaVazia(), parcelaVazia()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetAndClose = () => {
    setMotoboyId('')
    setDescricao('')
    setValor('')
    setData(hojeISO())
    setParcelando(false)
    setParcelas([parcelaVazia(), parcelaVazia()])
    setError('')
    onRequestClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!motoboyId || !descricao.trim()) {
      setError('Preencha todos os campos.')
      return
    }
    if (parcelando) {
      const parcelaInvalida = parcelas.some((p) => !p.valor || Number(p.valor) <= 0 || !p.data)
      if (parcelaInvalida) {
        setError('Preencha valor e data de todas as parcelas.')
        return
      }
    } else if (!valor) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (parcelando) {
        const novasParcelas = await createValeParcelado(motoboyId, descricao.trim(), parcelas)
        onValeAdded(novasParcelas)
      } else {
        const novoVale = await createVale(motoboyId, descricao.trim(), parseFloat(valor), data)
        onValeAdded(novoVale)
      }
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
      <MotoboyDescricaoFields
        motoboys={motoboys}
        motoboyId={motoboyId} setMotoboyId={setMotoboyId}
        descricao={descricao} setDescricao={setDescricao}
      />
      <label className="terms-check">
        <input type="checkbox" checked={parcelando} onChange={(e) => setParcelando(e.target.checked)} />
        <span>Parcelar este vale (valor e dia de cada parcela)</span>
      </label>
      {parcelando ? (
        <ParcelasFields parcelas={parcelas} setParcelas={setParcelas} />
      ) : (
        <>
          <label>
            Valor (R$)
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 100.00" />
          </label>
          <label>
            Data
            <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </label>
        </>
      )}
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

  const handleValeAdded = (added) => {
    const quantidade = Array.isArray(added) ? added.length : 1
    toast.success(quantidade > 1 ? `${quantidade} parcelas adicionadas.` : 'Vale adicionado.')
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

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="vales-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>{escopoProprio ? 'Meus Vales' : 'Vales'}</strong>
          <span>{escopoProprio ? 'Adiantamentos e descontos registrados em seu nome.' : 'Gerencie adiantamentos e descontos dos motoboys.'}</span>
        </div>
        {!escopoProprio && (
          <div className="flex flex-wrap gap-[10px] max-[650px]:w-full">
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

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] vales-panel">
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
                  <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Descrição'}>
                    {vale.descricao}
                    {vale.totalParcelas > 1 && (
                      <small className="block text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">Parcela {vale.numeroParcela}/{vale.totalParcelas}</small>
                    )}
                  </span>
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
              <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhum vale registrado.</div>
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
