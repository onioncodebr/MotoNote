import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight, Paperclip, Image as ImageIcon } from 'lucide-react'
import { createGasto, deleteGasto, getGastos, getMotoboyGastos, getMotoboys, removeComprovante, updateGasto, uploadComprovante } from '../services/api'
import { comprimirImagem } from '../utils/imageCompress'
import { Button } from './Button'
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

  // Comprovante (só escopoProprio anexa/remove) — um único input de arquivo
  // compartilhado entre as linhas da tabela, o alvo é guardado à parte.
  const comprovanteInputRef = useRef(null)
  const uploadTargetId = useRef(null)
  const [comprovanteBusyId, setComprovanteBusyId] = useState(null)

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

  const anexarComprovanteClick = (gastoId) => {
    uploadTargetId.current = gastoId
    comprovanteInputRef.current?.click()
  }

  const handleComprovanteFileChange = async (e) => {
    const arquivo = e.target.files?.[0]
    const gastoId = uploadTargetId.current
    e.target.value = ''
    uploadTargetId.current = null
    if (!arquivo || !gastoId) return

    setComprovanteBusyId(gastoId)
    try {
      const comprimido = await comprimirImagem(arquivo)
      const atualizado = await uploadComprovante(gastoId, comprimido)
      setGastos((prev) => prev.map((g) => (g.id === atualizado.id ? atualizado : g)))
      toast.success('Comprovante anexado.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível anexar o comprovante.')
    } finally {
      setComprovanteBusyId(null)
    }
  }

  const removerComprovanteClick = async (gastoId) => {
    setComprovanteBusyId(gastoId)
    try {
      const atualizado = await removeComprovante(gastoId)
      setGastos((prev) => prev.map((g) => (g.id === atualizado.id ? atualizado : g)))
      toast.success('Comprovante removido.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover o comprovante.')
    } finally {
      setComprovanteBusyId(null)
    }
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

  // .deliveries-table (compartilhada com Entregas) tem um número fixo de
  // faixas no CSS base — sem calcular o grid-template-columns aqui, as 5
  // colunas desta tabela (que não batem com esse número) quebravam em
  // grupos, cada linha "pulando" pra baixo no meio dos dados (mesmo bug já
  // corrigido em Clientes/Entregas). Frações (fr) em vez de px: a tabela
  // sempre soma exatamente a largura do card, então nunca precisa de
  // rolagem lateral — min-width:0 nas células (.deliveries-table em
  // App.css) é o que permite encolher e truncar com "…" em vez de vazar.
  const colunasGastos = escopoProprio
    ? ['1.6fr', '0.8fr', '0.8fr', '1fr', '1.1fr'] // Descrição, Data, Valor, Comprovante, Ações
    : ['1.2fr', '1.6fr', '0.8fr', '0.8fr', '1fr'] // Motoboy, Descrição, Data, Valor, Comprovante
  const estiloColunasGastos = { gridTemplateColumns: colunasGastos.join(' '), columnGap: '16px' }

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div>
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>{escopoProprio ? 'Meus Gastos' : 'Gastos dos Motoboys'}</strong>
          <span>{escopoProprio ? 'Registre pneu, gasolina, óleo e outros gastos com a moto.' : 'Acompanhe os gastos registrados pelos motoboys.'}</span>
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
          </div>
        )}
      </div>

      {/* Bloco de adicionar gasto — largura total, sempre no topo (mesmo
          padrão da aba Entregas: registro em cima, lista embaixo, em vez de
          lado a lado). */}
      {escopoProprio && (
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] register-delivery-panel">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3">
            <h2>Adicionar Gasto</h2>
          </div>
          <form className="delivery-form grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 items-start" onSubmit={handleSubmit}>
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
            {formError && <p className="col-span-full text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{formError}</p>}
            <Button type="submit" variant="dark" full className="col-span-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Gasto'}
            </Button>
          </form>
        </div>
      )}

      <div className="mt-[14px]">
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] recent-deliveries-panel">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3">
            <h2>{escopoProprio ? 'Gastos Recentes' : 'Gastos'}</h2>
          </div>
          <div className="deliveries-table">
            <div className="table-scroll" role="table" aria-label="Gastos">
              <div className="table-header" role="row" style={estiloColunasGastos}>
                {!escopoProprio && <span role="columnheader">Motoboy</span>}
                <span role="columnheader">Descrição</span>
                <span role="columnheader">Data</span>
                <span role="columnheader">Valor</span>
                <span role="columnheader">Comprovante</span>
                {escopoProprio && <span role="columnheader">Ações</span>}
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={5} style={estiloColunasGastos} />)
              ) : gastos.length > 0 ? (
                gastos.map((gasto) => (
                  <div className="table-row" role="row" key={gasto.id} style={estiloColunasGastos}>
                    {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(gasto.motoboyId)}</strong>}
                    <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Descrição'}>{gasto.descricao}</span>
                    <span role="cell" data-label="Data">{formatarData(gasto.localDate)}</span>
                    <span role="cell" data-label="Valor">{formatarMoeda(gasto.value)}</span>
                    <div className="table-actions" role="cell" data-label="Comprovante">
                      {gasto.comprovanteUrl && (
                        <button type="button" onClick={() => window.open(gasto.comprovanteUrl, '_blank', 'noopener,noreferrer')}>
                          <ImageIcon size={14} /> Ver
                        </button>
                      )}
                      {escopoProprio && (
                        gasto.comprovanteUrl ? (
                          <button
                            type="button"
                            className="delete-button"
                            disabled={comprovanteBusyId === gasto.id}
                            onClick={() => removerComprovanteClick(gasto.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={comprovanteBusyId === gasto.id}
                            onClick={() => anexarComprovanteClick(gasto.id)}
                          >
                            <Paperclip size={14} /> {comprovanteBusyId === gasto.id ? 'Enviando...' : 'Anexar'}
                          </button>
                        )
                      )}
                      {!gasto.comprovanteUrl && !escopoProprio && '—'}
                    </div>
                    {escopoProprio && (
                      <div className="table-actions" role="cell">
                        <button onClick={() => setEditingGasto(gasto)}><Pencil size={14} /> Editar</button>
                        <button className="delete-button" onClick={() => requestDelete(gasto)}><Trash2 size={14} /> Excluir</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhum gasto registrado.</div>
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

      {escopoProprio && (
        <>
          <input
            ref={comprovanteInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleComprovanteFileChange}
          />
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
