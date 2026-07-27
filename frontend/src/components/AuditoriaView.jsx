import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Search, ShieldCheck } from 'lucide-react'
import { getAuditoriaPaged } from '../services/api'
import { exportAuditoriaToExcel } from '../services/exportService'
import { formatarDataHora } from '../utils/format'
import { Button } from './Button'
import { SkeletonRow } from './Skeleton'

const PAGE_SIZE = 20
// Tamanho de página usado só pra varrer tudo na exportação (loop de
// páginas) — mesma técnica de UsuariosView/AssinaturasView.
const EXPORT_PAGE_SIZE = 100

// Rótulos em pt-BR pro enum TipoAcaoAuditoria do backend.
const ACAO_LABELS = {
  USUARIO_CRIADO: 'Usuário criado',
  USUARIO_EDITADO: 'Usuário editado',
  USUARIO_BLOQUEADO: 'Usuário bloqueado',
  USUARIO_REATIVADO: 'Usuário reativado',
  USUARIO_EXCLUIDO: 'Usuário excluído',
  ASSINATURA_CONCEDIDA_MANUAL: 'Cortesia concedida',
  ASSINATURA_REVOGADA: 'Assinatura revogada',
  CONFIGURACAO_ALTERADA: 'Configuração alterada',
}

function formatarDetalhes(detalhes) {
  if (!detalhes || Object.keys(detalhes).length === 0) return '—'
  return Object.entries(detalhes).map(([chave, valor]) => `${chave}: ${valor}`).join(', ')
}

// Registro de ações administrativas sensíveis do MASTER (criação/edição/
// bloqueio/reativação/exclusão de usuário, concessão/revogação manual de
// assinatura). Mais recentes primeiro, com filtro por ação, ator e período.
export function AuditoriaView() {
  const [registros, setRegistros] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const [acaoFiltro, setAcaoFiltro] = useState('')
  const [ator, setAtor] = useState('')
  const [atorAplicado, setAtorAplicado] = useState('')
  const [desde, setDesde] = useState('')
  const [ate, setAte] = useState('')

  const filtrosAtuais = { acao: acaoFiltro || undefined, ator: atorAplicado || undefined, desde: desde || undefined, ate: ate || undefined }

  const fetchAuditoria = async (pageToLoad, filtros) => {
    try {
      setIsLoading(true)
      setError('')
      const data = await getAuditoriaPaged(pageToLoad, PAGE_SIZE, filtros)
      setRegistros(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
      setPage(pageToLoad)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o log de auditoria.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditoria(0, filtrosAtuais)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acaoFiltro, atorAplicado, desde, ate])

  const handleSubmitAtor = (e) => {
    e.preventDefault()
    setAtorAplicado(ator.trim())
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const primeira = await getAuditoriaPaged(0, EXPORT_PAGE_SIZE, filtrosAtuais)
      let todos = primeira?.content || []
      const totalPages = primeira?.totalPages || 0
      for (let p = 1; p < totalPages; p++) {
        const pagina = await getAuditoriaPaged(p, EXPORT_PAGE_SIZE, filtrosAtuais)
        todos = todos.concat(pagina?.content || [])
      }
      await exportAuditoriaToExcel(todos)
    } catch (err) {
      setError(err.message || 'Não foi possível exportar o log de auditoria.')
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  const temFiltroAtivo = !!(acaoFiltro || atorAplicado || desde || ate)

  return (
    <div className="auditoria-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Log de auditoria</strong>
          <span>Ações administrativas sensíveis, mais recentes primeiro.</span>
        </div>
      </div>

      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <form className="usuarios-toolbar-actions" onSubmit={handleSubmitAtor}>
          <input
            type="search"
            value={ator}
            onChange={(e) => setAtor(e.target.value)}
            placeholder="Buscar por quem fez (nome ou e-mail)..."
            aria-label="Buscar por ator"
          />
          <Button type="submit" variant="outline" size="small"><Search size={16} /> Buscar</Button>
        </form>
        <div className="usuarios-toolbar-actions">
          <select value={acaoFiltro} onChange={(e) => setAcaoFiltro(e.target.value)} aria-label="Filtrar por tipo de ação">
            <option value="">Todas as ações</option>
            {Object.entries(ACAO_LABELS).map(([acao, label]) => (
              <option key={acao} value={acao}>{label}</option>
            ))}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="De" title="De" />
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" title="Até" />
          <Button variant="outline" size="small" onClick={handleExport} disabled={isExporting || pageInfo.totalElements === 0}>
            <Download size={16} /> {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
        <div className="table-scroll" role="table" aria-label="Log de auditoria">
          <div className="table-header auditoria-table-header" role="row">
            <span role="columnheader">Quando</span>
            <span role="columnheader">Quem</span>
            <span role="columnheader">Ação</span>
            <span role="columnheader">Alvo</span>
            <span role="columnheader">Detalhes</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={5} />)
          ) : registros.length > 0 ? (
            registros.map((registro) => (
              <div className="table-row auditoria-table-row" role="row" key={registro.id}>
                <span role="cell" data-label="Quando">{formatarDataHora(registro.criadoEm)}</span>
                <span role="cell" data-label="Quem">{registro.actorNome} <small>({registro.actorEmail})</small></span>
                <span role="cell" data-label="Ação">{ACAO_LABELS[registro.acao] || registro.acao}</span>
                <span role="cell" data-label="Alvo">{registro.alvoDescricao || '—'}</span>
                <span role="cell" data-label="Detalhes">{formatarDetalhes(registro.detalhes)}</span>
              </div>
            ))
          ) : (
            <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><ShieldCheck size={22} />{temFiltroAtivo ? 'Nenhuma ação encontrada com esses filtros.' : 'Nenhuma ação registrada ainda.'}</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-[14px] pt-[14px] border-t border-[var(--dash-border-soft)] text-[var(--dash-text-faint)] text-[length:var(--fs-xs)]">
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => fetchAuditoria(Math.max(page - 1, 0), filtrosAtuais)}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => fetchAuditoria(Math.min(page + 1, pageInfo.totalPages - 1), filtrosAtuais)}
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
