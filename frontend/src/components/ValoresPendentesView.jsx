import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { getEntregasPendentes, getResumoPendentes, getMotoboys, darBaixaEntrega, darBaixaEmMassa } from '../services/api'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData } from '../utils/format'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'
import { PeriodoFilter } from './PeriodoFilter'

const PAGE_SIZE = 20

// Só o período semana/mês faz sentido aqui — pendências muito antigas
// (hoje/ontem) seriam um subconjunto raro demais pra valer um filtro.
const PERIODOS_PENDENTES = {
  semana: PERIODOS.semana,
  mes: PERIODOS.mes,
  personalizado: PERIODOS.personalizado,
}

export function ValoresPendentesView({ user }) {
  const toast = useToast()
  const [motoboys, setMotoboys] = useState([])
  const [motoboyId, setMotoboyId] = useState('')
  const [periodo, setPeriodo] = useState('semana')
  const [startDatePersonalizado, setStartDatePersonalizado] = useState('')
  const [endDatePersonalizado, setEndDatePersonalizado] = useState('')
  const [pendentes, setPendentes] = useState([])
  const [resumo, setResumo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [selecionados, setSelecionados] = useState(() => new Set())

  const [baixaIndividual, setBaixaIndividual] = useState(null)
  const [confirmandoEmMassa, setConfirmandoEmMassa] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState('')

  useEffect(() => {
    getMotoboys().then((data) => setMotoboys(data || [])).catch(() => {})
  }, [])

  const fetchData = useCallback(async (pageToLoad) => {
    try {
      const { startDate, endDate } = getIntervaloPeriodo(periodo, { startDate: startDatePersonalizado, endDate: endDatePersonalizado })
      if (!startDate || !endDate) return
      setIsLoading(true)
      setError('')
      const [pendentesPage, resumoData] = await Promise.all([
        getEntregasPendentes(startDate, endDate, motoboyId || undefined, pageToLoad, PAGE_SIZE),
        getResumoPendentes(startDate, endDate, motoboyId || undefined),
      ])
      setPendentes(pendentesPage?.content || [])
      setPageInfo({ totalPages: pendentesPage?.totalPages || 0, totalElements: pendentesPage?.totalElements || 0 })
      setResumo(resumoData)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os valores pendentes.')
    } finally {
      setIsLoading(false)
    }
  }, [periodo, startDatePersonalizado, endDatePersonalizado, motoboyId])

  // Muda de filtro: volta pra primeira página e limpa a seleção (que era da
  // página/filtro anterior).
  useEffect(() => {
    setPage(0)
    setSelecionados(new Set())
  }, [periodo, startDatePersonalizado, endDatePersonalizado, motoboyId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (id) => motoboyNameById[id] || 'Motoboy removido'

  const todosSelecionadosNaPagina = pendentes.length > 0 && pendentes.every((e) => selecionados.has(e.id))

  const alternarTodos = () => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (todosSelecionadosNaPagina) {
        pendentes.forEach((e) => novo.delete(e.id))
      } else {
        pendentes.forEach((e) => novo.add(e.id))
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

  const valorSelecionado = pendentes
    .filter((e) => selecionados.has(e.id))
    .reduce((sum, e) => sum + (e.valorPedido ?? 0), 0)

  const confirmarBaixaIndividual = async () => {
    if (!baixaIndividual) return
    setIsProcessing(true)
    setProcessError('')
    try {
      await darBaixaEntrega(baixaIndividual.id)
      toast.success('Recebimento confirmado.')
      setBaixaIndividual(null)
      setSelecionados((atual) => {
        const novo = new Set(atual)
        novo.delete(baixaIndividual.id)
        return novo
      })
      const restantesNaPagina = pendentes.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        setPage((p) => p - 1)
      } else {
        fetchData(page)
      }
    } catch (err) {
      setProcessError(err.message || 'Não foi possível confirmar o recebimento.')
    } finally {
      setIsProcessing(false)
    }
  }

  const confirmarBaixaEmMassa = async () => {
    setIsProcessing(true)
    setProcessError('')
    try {
      await darBaixaEmMassa(Array.from(selecionados))
      toast.success(`${selecionados.size} recebimento(s) confirmado(s).`)
      setConfirmandoEmMassa(false)
      setSelecionados(new Set())
      setPage(0)
      fetchData(0)
    } catch (err) {
      setProcessError(err.message || 'Não foi possível confirmar os recebimentos selecionados.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="pendentes-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Valores Pendentes</strong>
          <span>Confira e dê baixa nos valores em dinheiro ainda não repassados pelos motoboys.</span>
        </div>
        <div className="flex flex-wrap gap-[10px] max-[650px]:w-full">
          <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
            <option value="">Todos os motoboys</option>
            {motoboys.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <PeriodoFilter
            periodos={PERIODOS_PENDENTES}
            value={periodo}
            onChange={setPeriodo}
            startDate={startDatePersonalizado}
            endDate={endDatePersonalizado}
            onStartDateChange={setStartDatePersonalizado}
            onEndDateChange={setEndDatePersonalizado}
          />
        </div>
      </div>

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
        <div className="panel-header flex flex-wrap justify-between items-start gap-3">
          <h2>Pendentes de recebimento</h2>
          {selecionados.size > 0 && (
            <Button
              type="button"
              variant="dark"
              size="small"
              onClick={() => { setProcessError(''); setConfirmandoEmMassa(true) }}
            >
              Dar baixa em massa ({selecionados.size})
            </Button>
          )}
        </div>
        <div className="report-summary">
          <div><small>Entregas Pendentes</small><strong>{isLoading ? '—' : (resumo?.quantidadeEntregas ?? 0)}</strong></div>
          <div><small>Valor Pendente</small><strong>{isLoading ? '—' : formatarMoeda(resumo?.valorTotal ?? 0)}</strong></div>
        </div>
        <div className="pendentes-table">
          <div className="table-scroll" role="table" aria-label="Valores pendentes">
            <div className="table-header" role="row">
              <span role="columnheader">
                <input
                  type="checkbox"
                  checked={todosSelecionadosNaPagina}
                  onChange={alternarTodos}
                  disabled={pendentes.length === 0}
                  aria-label="Selecionar todos os itens desta página"
                />
              </span>
              <span role="columnheader">Motoboy</span>
              <span role="columnheader">Data</span>
              <span role="columnheader">Valor do Pedido</span>
              <span role="columnheader">Ação</span>
            </div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={5} />)
            ) : pendentes.length > 0 ? (
              pendentes.map((entrega) => (
                <div className="table-row" role="row" key={entrega.id}>
                  <span role="cell">
                    <input
                      type="checkbox"
                      checked={selecionados.has(entrega.id)}
                      onChange={() => alternarSelecionado(entrega.id)}
                      aria-label={`Selecionar entrega de ${formatarMoeda(entrega.valorPedido)}`}
                    />
                  </span>
                  <strong className="cell-title" role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>
                  <span role="cell" data-label="Data">{formatarData(entrega.localDate)}</span>
                  <span role="cell" data-label="Valor do Pedido">{formatarMoeda(entrega.valorPedido)}</span>
                  <div className="table-actions" role="cell">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => { setProcessError(''); setBaixaIndividual(entrega) }}
                    >
                      Dar baixa
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhum valor pendente no período selecionado.</div>
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

      <ConfirmDialog
        isOpen={!!baixaIndividual}
        title="Confirmar recebimento"
        message={baixaIndividual ? `Confirma que o valor de ${formatarMoeda(baixaIndividual.valorPedido)} em dinheiro foi recebido? Você não pode voltar atrás depois que clicar em confirmar.` : ''}
        confirmLabel="Confirmar recebimento"
        isLoading={isProcessing}
        error={processError}
        onCancel={() => setBaixaIndividual(null)}
        onConfirm={confirmarBaixaIndividual}
      />

      <ConfirmDialog
        isOpen={confirmandoEmMassa}
        title="Confirmar recebimentos em massa"
        message={`Confirma que os ${selecionados.size} valores selecionados (total de ${formatarMoeda(valorSelecionado)}) em dinheiro foram recebidos? Você não pode voltar atrás depois que clicar em confirmar.`}
        confirmLabel="Confirmar recebimentos"
        isLoading={isProcessing}
        error={processError}
        onCancel={() => setConfirmandoEmMassa(false)}
        onConfirm={confirmarBaixaEmMassa}
      />
    </div>
  )
}
