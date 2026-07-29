import { useEffect, useState } from 'react'
import { SearchX, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getMotoboyRelatorio, getMotoboyRelatorioPaginado, getMotoboyResumo,
  getMotoboys, getReport, getReportPaginado, getResumo, getClientes,
} from '../services/api'
import { exportToExcel } from '../services/exportService'
import { toLocalIsoDate } from '../utils/date'
import { PERIODOS_RELATORIO, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda, formatarData } from '../utils/format'
import { FORMA_PAGAMENTO_LABELS, STATUS_RECEBIMENTO_LABELS, STATUS_RECEBIMENTO_CLASSES } from '../utils/entregaPagamento'
import { STATUS_LOGISTICO_LABELS, STATUS_LOGISTICO_CLASSES } from '../utils/statusLogistico'
import { Button } from './Button'
import { SkeletonRow } from './Skeleton'

const PAGE_SIZE = 20

// "dia" e "personalizado" pedem uma data digitada pelo usuário; os outros
// três presets são calculados sozinhos a partir de hoje (ver utils/periodo).
function calcularIntervalo(preset, diaEspecifico, startDate, endDate) {
  if (preset === 'dia') {
    return { startDate: diaEspecifico, endDate: diaEspecifico }
  }
  if (preset === 'personalizado') {
    return { startDate, endDate }
  }
  return getIntervaloPeriodo(preset)
}

// escopoProprio: modo do portal do motoboy — relatório e exportação só das
// próprias entregas, sem seletor de motoboy nem a coluna "Motoboy" na tabela.
export function RelatoriosView({ user, escopoProprio = false }) {
  const [motoboys, setMotoboys] = useState([])
  const [reportData, setReportData] = useState([])
  const [resumo, setResumo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  // Filtros digitados — podem ser editados livremente sem reafetar nada
  // até o usuário clicar em "Gerar Relatório". Mesmos 5 presets de período
  // usados na aba Entregas (semana/semana passada/mês/dia/período), só que
  // aqui "período específico" ainda usa os dois campos de data livres.
  const [presetPeriodo, setPresetPeriodo] = useState('semana')
  const [diaEspecifico, setDiaEspecifico] = useState(toLocalIsoDate(new Date()))
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [motoboyId, setMotoboyId] = useState('')

  // Cliente vinculado (só pra resolver o nome na tabela/export quando a
  // conta usa cadastro de clientes) — mesmo papel de clienteNameById em
  // EntregasView.jsx.
  const [clientesList, setClientesList] = useState([])
  useEffect(() => {
    if (!user?.permitirCadastroClientes || escopoProprio) return
    let cancelado = false
    getClientes().then((data) => { if (!cancelado) setClientesList(data || []) }).catch(() => {})
    return () => { cancelado = true }
  }, [user?.permitirCadastroClientes, escopoProprio])
  const clienteNameById = Object.fromEntries(clientesList.map((c) => [c.id, c.nome]))
  const exigeDadosCliente = !!user?.permitirDadosCliente
  const permiteVincularCliente = !!user?.permitirCadastroClientes

  // Filtros do último relatório efetivamente gerado: é o que a tabela, os
  // totais, a paginação e o export usam — assim, se o usuário mexer nos
  // campos sem clicar em "Gerar Relatório" de novo, nada muda por baixo.
  const [generatedFilters, setGeneratedFilters] = useState(null)
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  useEffect(() => {
    if (escopoProprio) return
    getMotoboys().then(data => setMotoboys(data || [])).catch(() => setError('Não foi possível carregar os motoboys.'))
  }, [escopoProprio])

  const fetchPage = async (filters, pageToLoad) => {
    const pagina = escopoProprio
      ? await getMotoboyRelatorioPaginado(filters.startDate, filters.endDate, pageToLoad, PAGE_SIZE)
      : await getReportPaginado(filters.startDate, filters.endDate, filters.motoboyId, pageToLoad, PAGE_SIZE)
    setReportData(pagina?.content || [])
    setPageInfo({ totalPages: pagina?.totalPages || 0, totalElements: pagina?.totalElements || 0 })
  }

  const handleGenerateReport = async (e) => {
    e.preventDefault()
    const intervalo = calcularIntervalo(presetPeriodo, diaEspecifico, startDate, endDate)
    if (!intervalo.startDate || !intervalo.endDate) {
      setError('Selecione as datas do período.')
      return
    }
    if (intervalo.startDate > intervalo.endDate) {
      setError('A data de início não pode ser depois da data de fim.')
      return
    }
    const filters = { startDate: intervalo.startDate, endDate: intervalo.endDate, motoboyId }
    setIsLoading(true)
    setError('')
    try {
      const resumoPromise = escopoProprio
        ? getMotoboyResumo(intervalo.startDate, intervalo.endDate)
        : getResumo(intervalo.startDate, intervalo.endDate, motoboyId)
      const [, resumoData] = await Promise.all([fetchPage(filters, 0), resumoPromise])
      setResumo(resumoData)
      setGeneratedFilters(filters)
      setPage(0)
    } catch (err) {
      setError(err.message || 'Erro ao gerar relatório.')
      setReportData([])
      setResumo(null)
      setGeneratedFilters(null)
      setPageInfo({ totalPages: 0, totalElements: 0 })
    } finally {
      setIsLoading(false)
    }
  }

  const goToPage = async (newPage) => {
    if (!generatedFilters) return
    setIsLoading(true)
    setError('')
    try {
      await fetchPage(generatedFilters, newPage)
      setPage(newPage)
    } catch (err) {
      setError(err.message || 'Erro ao carregar a página.')
    } finally {
      setIsLoading(false)
    }
  }

  // A API não retorna o nome do motoboy na entrega (só motoboyId); resolvemos localmente.
  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))
  const nomeMotoboy = (motoboyId) => escopoProprio ? (user?.name || '') : (motoboyNameById[motoboyId] || 'Motoboy removido')

  const handleExport = async () => {
    if (!generatedFilters) return
    setIsExporting(true)
    setError('')
    try {
      const dadosCompletos = escopoProprio
        ? await getMotoboyRelatorio(generatedFilters.startDate, generatedFilters.endDate)
        : await getReport(generatedFilters.startDate, generatedFilters.endDate, generatedFilters.motoboyId)
      const enrichedData = (dadosCompletos || []).map((item) => ({
        ...item,
        motoboyName: nomeMotoboy(item.motoboyId),
        clienteNome: permiteVincularCliente ? (clienteNameById[item.clienteId] || '') : (item.nomeCliente || ''),
      }))
      await exportToExcel(enrichedData, undefined, {
        detalhado: !escopoProprio,
        comFluxo: !escopoProprio && !!user?.controleFluxoEntregaHabilitado,
      })
    } catch (err) {
      setError(err.message || 'Erro ao exportar o relatório.')
    } finally {
      setIsExporting(false)
    }
  }

  const totalEntregas = resumo?.quantidadeEntregas ?? 0
  const valorTotal = resumo?.valorTotal ?? 0

  // Mesmas colunas (e mesma lógica de largura em fr) da tabela "Entregas
  // Recentes" em EntregasView.jsx, só sem a coluna de Ações — aqui é
  // relatório somente leitura. Ver comentário lá pra detalhes do porquê de
  // fr + min-width:0 em vez de px fixo (evita rolagem lateral e overlap).
  const colunasRelatorio = escopoProprio
    ? ['1fr', '1fr']
    : [
        '1.4fr', '0.8fr', '0.8fr', '1fr', '0.9fr',
        ...(exigeDadosCliente && !permiteVincularCliente ? ['1fr'] : []),
        ...(permiteVincularCliente ? ['1fr'] : []),
        '0.9fr',
        ...(user?.controleFluxoEntregaHabilitado ? ['1.3fr'] : []),
      ]
  const estiloColunasRelatorio = { gridTemplateColumns: colunasRelatorio.join(' '), columnGap: '16px' }

  return (
    <div className="relatorios-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>{escopoProprio ? 'Meus Relatórios' : 'Relatórios de Entregas'}</strong>
          <span>{escopoProprio ? 'Filtre e exporte os dados das suas entregas.' : 'Filtre e exporte os dados da sua operação.'}</span>
        </div>
      </div>

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] filters-panel">
        <form className="filters-form grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] max-[650px]:grid-cols-1 items-end gap-[var(--space-4)]" onSubmit={handleGenerateReport}>
          <label>
            Período
            <select value={presetPeriodo} onChange={e => setPresetPeriodo(e.target.value)}>
              {Object.entries(PERIODOS_RELATORIO).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          {presetPeriodo === 'dia' && (
            <label>
              Data
              <input type="date" value={diaEspecifico} max={toLocalIsoDate(new Date())} onChange={e => setDiaEspecifico(e.target.value)} required />
            </label>
          )}
          {presetPeriodo === 'personalizado' && (
            <>
              <label>
                Data Início
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </label>
              <label>
                Data Fim
                <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} required />
              </label>
            </>
          )}
          {!escopoProprio && (
            <label>
              Motoboy (opcional)
              <select value={motoboyId} onChange={e => setMotoboyId(e.target.value)}>
                <option value="">Todos os motoboys</option>
                {motoboys.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-[var(--space-3)] mt-0 justify-start">
            <Button type="submit" variant="dark" size="small" disabled={isLoading}>{isLoading ? 'Gerando...' : 'Gerar Relatório'}</Button>
            <Button type="button" variant="outline" size="small" onClick={handleExport} disabled={!generatedFilters || totalEntregas === 0 || isExporting}>
              {isExporting ? 'Exportando...' : 'Exportar para Excel'}
            </Button>
          </div>
        </form>
        {error && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] mt-[15px] mr-0 mb-0 ml-0">{error}</p>}
      </div>

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] report-results-panel">
        <div className="panel-header flex flex-wrap justify-between items-start gap-3">
          <h2>Resultados</h2>
        </div>
        <div className="report-summary">
          <div><small>Total de Entregas</small><strong>{totalEntregas}</strong></div>
          <div><small>Valor Total</small><strong>{formatarMoeda(valorTotal)}</strong></div>
        </div>
        <div className={escopoProprio ? 'deliveries-table deliveries-table-leitura' : 'deliveries-table'}>
          <div className="table-scroll" role="table" aria-label="Relatório de entregas">
            <div className="table-header" role="row" style={estiloColunasRelatorio}>
              {!escopoProprio && <span role="columnheader">Motoboy</span>}
              <span role="columnheader">Data</span>
              <span role="columnheader">Valor</span>
              {!escopoProprio && <span role="columnheader">Forma de Pagamento</span>}
              {!escopoProprio && <span role="columnheader">Valor do Pedido</span>}
              {!escopoProprio && exigeDadosCliente && !permiteVincularCliente && <span role="columnheader">Cliente</span>}
              {!escopoProprio && permiteVincularCliente && <span role="columnheader">Cliente Vinculado</span>}
              {!escopoProprio && <span role="columnheader">Status</span>}
              {!escopoProprio && user?.controleFluxoEntregaHabilitado && <span role="columnheader">Fluxo</span>}
            </div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 2 : colunasRelatorio.length} style={estiloColunasRelatorio} />)
            ) : (
              reportData.length > 0 ? (
                reportData.map((entrega) => (
                  <div className="table-row" role="row" key={entrega.id} style={estiloColunasRelatorio}>
                    {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>}
                    <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Data'}>{formatarData(entrega.localDate)}</span>
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
                  </div>
                ))
              ) : (
                <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]">
                  <SearchX size={22} />
                  {generatedFilters ? 'Nenhum resultado encontrado para os filtros selecionados.' : 'Escolha um período e clique em "Gerar Relatório".'}
                </div>
              )
            )}
          </div>
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-[14px] pt-[14px] border-t border-[var(--dash-border-soft)] text-[var(--dash-text-faint)] text-[length:var(--fs-xs)]">
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => goToPage(Math.max(page - 1, 0))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => goToPage(Math.min(page + 1, pageInfo.totalPages - 1))}
              disabled={page + 1 >= pageInfo.totalPages}
            >
              Próxima <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
