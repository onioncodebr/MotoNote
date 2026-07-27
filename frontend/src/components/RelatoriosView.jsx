import { useEffect, useState } from 'react'
import { SearchX, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getMotoboyRelatorio, getMotoboyRelatorioPaginado, getMotoboyResumo,
  getMotoboys, getReport, getReportPaginado, getResumo,
} from '../services/api'
import { exportToExcel } from '../services/exportService'
import { formatarMoeda, formatarData } from '../utils/format'
import { Button } from './Button'
import { SkeletonRow } from './Skeleton'

const PAGE_SIZE = 20

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
  // até o usuário clicar em "Gerar Relatório".
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [motoboyId, setMotoboyId] = useState('')

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
    if (!startDate || !endDate) {
      setError('As datas de início e fim são obrigatórias.')
      return
    }
    if (startDate > endDate) {
      setError('A data de início não pode ser depois da data de fim.')
      return
    }
    const filters = { startDate, endDate, motoboyId }
    setIsLoading(true)
    setError('')
    try {
      const resumoPromise = escopoProprio
        ? getMotoboyResumo(startDate, endDate)
        : getResumo(startDate, endDate, motoboyId)
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
      const enrichedData = (dadosCompletos || []).map((item) => ({ ...item, motoboyName: nomeMotoboy(item.motoboyId) }))
      await exportToExcel(enrichedData)
    } catch (err) {
      setError(err.message || 'Erro ao exportar o relatório.')
    } finally {
      setIsExporting(false)
    }
  }

  const totalEntregas = resumo?.quantidadeEntregas ?? 0
  const valorTotal = resumo?.valorTotal ?? 0

  return (
    <div className="relatorios-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>{escopoProprio ? 'Meus Relatórios' : 'Relatórios de Entregas'}</strong>
          <span>{escopoProprio ? 'Filtre e exporte os dados das suas entregas.' : 'Filtre e exporte os dados da sua operação.'}</span>
        </div>
      </div>

      <div className="panel filters-panel">
        <form className="filters-form" onSubmit={handleGenerateReport}>
          <label>
            Data Início
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </label>
          <label>
            Data Fim
            <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} required />
          </label>
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

      <div className="panel report-results-panel">
        <div className="panel-header">
          <h2>Resultados</h2>
        </div>
        <div className="report-summary">
          <div><small>Total de Entregas</small><strong>{totalEntregas}</strong></div>
          <div><small>Valor Total</small><strong>{formatarMoeda(valorTotal)}</strong></div>
        </div>
        <div className={escopoProprio ? 'deliveries-table deliveries-table-leitura' : 'deliveries-table'}>
          <div className="table-scroll" role="table" aria-label="Relatório de entregas">
            <div className="table-header" role="row">
              {!escopoProprio && <span role="columnheader">Motoboy</span>}
              <span role="columnheader">Data</span>
              <span role="columnheader">Valor</span>
            </div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={escopoProprio ? 2 : 3} />)
            ) : (
              reportData.length > 0 ? (
                reportData.map((entrega) => (
                  <div className="table-row" role="row" key={entrega.id}>
                    {!escopoProprio && <strong className="cell-title" role="cell">{nomeMotoboy(entrega.motoboyId)}</strong>}
                    <span role="cell" className={escopoProprio ? 'cell-title' : ''} data-label={escopoProprio ? undefined : 'Data'}>{formatarData(entrega.localDate)}</span>
                    <span role="cell" data-label="Valor">{formatarMoeda(entrega.value)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <SearchX size={22} />
                  {generatedFilters ? 'Nenhum resultado encontrado para os filtros selecionados.' : 'Escolha um período e clique em "Gerar Relatório".'}
                </div>
              )
            )}
          </div>
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
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
