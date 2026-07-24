import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Gift, Undo2, Wallet } from 'lucide-react'
import { concederAssinaturaManual, getAssinaturasPaged, revogarAssinaturaManual } from '../services/api'
import { exportAssinaturasToExcel } from '../services/exportService'
import { formatarDataHora } from '../utils/format'
import { STATUS_LABELS, STATUS_CLASSES, STATUS_FILTRO_OPTIONS } from '../utils/status'
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const PAGE_SIZE = 20
// Tamanho de página usado só pra varrer tudo na exportação (loop de
// páginas) — maior pra fazer menos requisições, mesma técnica de UsuariosView.
const EXPORT_PAGE_SIZE = 100

function ConcederCortesiaModal({ isOpen, onRequestClose, assinatura, onConcedida }) {
  const [diasCortesia, setDiasCortesia] = useState(15)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDiasCortesia(15)
    setError('')
  }, [assinatura])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!diasCortesia || diasCortesia <= 0) {
      setError('Informe uma quantidade de dias válida.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await concederAssinaturaManual(assinatura.usuarioId, Number(diasCortesia))
      onConcedida(assinatura, Number(diasCortesia))
      onRequestClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível conceder a cortesia.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Conceder cortesia"
      contentLabel="Conceder cortesia"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Conceder"
      submitLabelLoading="Concedendo..."
      width={380}
    >
      <p className="confirm-dialog-message">
        Conceder acesso de cortesia para <strong>{assinatura?.nomeEmpresa}</strong>. O status passa a TRIALING pelo número de dias informado.
      </p>
      <label>
        Dias de cortesia
        <input
          type="number"
          min={1}
          value={diasCortesia}
          onChange={(e) => setDiasCortesia(e.target.value)}
          autoFocus
        />
      </label>
    </FormModal>
  )
}

export function AssinaturasView() {
  const toast = useToast()
  const [assinaturas, setAssinaturas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [concedendoPara, setConcedendoPara] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [revogandoPara, setRevogandoPara] = useState(null)
  const [isRevogando, setIsRevogando] = useState(false)
  const [revogarError, setRevogarError] = useState('')

  const fetchAssinaturas = async (pageToLoad, status) => {
    try {
      setIsLoading(true)
      setError('')
      const data = await getAssinaturasPaged(pageToLoad, PAGE_SIZE, status || undefined)
      setAssinaturas(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
      setPage(pageToLoad)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as assinaturas.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAssinaturas(0, statusFiltro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro])

  const handleConcedida = (assinatura, dias) => {
    toast.success(`Cortesia de ${dias} dias concedida para "${assinatura.nomeEmpresa}".`)
    fetchAssinaturas(page, statusFiltro)
  }

  const requestRevogar = (assinatura) => {
    setRevogarError('')
    setRevogandoPara(assinatura)
  }

  const confirmRevogar = async () => {
    if (!revogandoPara) return
    setIsRevogando(true)
    setRevogarError('')
    try {
      await revogarAssinaturaManual(revogandoPara.usuarioId)
      toast.success(`Assinatura de "${revogandoPara.nomeEmpresa}" revogada.`)
      setRevogandoPara(null)
      fetchAssinaturas(page, statusFiltro)
    } catch (err) {
      setRevogarError(err.message || 'Não foi possível revogar a assinatura.')
    } finally {
      setIsRevogando(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const primeira = await getAssinaturasPaged(0, EXPORT_PAGE_SIZE, statusFiltro || undefined)
      let todas = primeira?.content || []
      const totalPages = primeira?.totalPages || 0
      for (let p = 1; p < totalPages; p++) {
        const pagina = await getAssinaturasPaged(p, EXPORT_PAGE_SIZE, statusFiltro || undefined)
        todas = todas.concat(pagina?.content || [])
      }
      await exportAssinaturasToExcel(todas)
    } catch (err) {
      setError(err.message || 'Não foi possível exportar as assinaturas.')
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="assinaturas-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Gestão de Assinaturas</strong>
          <span>Acompanhe o status de assinatura de cada cliente e conceda cortesias.</span>
        </div>
        <div className="usuarios-toolbar-actions">
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} aria-label="Filtrar por status da assinatura">
            <option value="">Todos os status</option>
            {STATUS_FILTRO_OPTIONS.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
            ))}
          </select>
          <button className="button button-outline small-button" onClick={handleExport} disabled={isExporting || pageInfo.totalElements === 0}>
            <Download size={16} /> {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll" role="table" aria-label="Assinaturas">
          <div className="table-header assinaturas-table-header" role="row">
            <span role="columnheader">Empresa</span>
            <span role="columnheader">E-mail</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Trial termina em</span>
            <span role="columnheader">Período atual termina em</span>
            <span role="columnheader">Ações</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={6} />)
          ) : assinaturas.length > 0 ? (
            assinaturas.map((assinatura) => (
              <div className="table-row assinaturas-table-row" role="row" key={assinatura.usuarioId}>
                <strong className="cell-title" role="cell">{assinatura.nomeEmpresa}</strong>
                <span role="cell" data-label="E-mail">{assinatura.emailEmpresa}</span>
                <span role="cell" data-label="Status">
                  <span className={STATUS_CLASSES[assinatura.status] || 'plan-badge neutral'}>{STATUS_LABELS[assinatura.status] || assinatura.status}</span>
                </span>
                <span role="cell" data-label="Trial termina em">{formatarDataHora(assinatura.trialTerminaEm)}</span>
                <span role="cell" data-label="Período atual termina em">{formatarDataHora(assinatura.periodoAtualTerminaEm)}</span>
                <div className="table-actions" role="cell">
                  <button onClick={() => setConcedendoPara(assinatura)}><Gift size={14} /> Conceder cortesia</button>
                  {assinatura.status !== 'SEM_ASSINATURA' && (
                    <button onClick={() => requestRevogar(assinatura)}><Undo2 size={14} /> Revogar</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><Wallet size={22} />{statusFiltro ? 'Nenhuma assinatura com esse status.' : 'Nenhuma assinatura cadastrada.'}</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchAssinaturas(Math.max(page - 1, 0), statusFiltro)}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchAssinaturas(Math.min(page + 1, pageInfo.totalPages - 1), statusFiltro)}
              disabled={page + 1 >= pageInfo.totalPages}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <ConcederCortesiaModal
        isOpen={!!concedendoPara}
        onRequestClose={() => setConcedendoPara(null)}
        assinatura={concedendoPara}
        onConcedida={handleConcedida}
      />
      <ConfirmDialog
        isOpen={!!revogandoPara}
        title="Revogar assinatura"
        message={`Tem certeza que deseja revogar a assinatura de "${revogandoPara?.nomeEmpresa}"? O status volta para "Sem assinatura" e o acesso é removido imediatamente. Assinaturas com cobrança real no Stripe não podem ser revogadas por aqui.`}
        confirmLabel="Revogar"
        isLoading={isRevogando}
        error={revogarError}
        onCancel={() => setRevogandoPara(null)}
        onConfirm={confirmRevogar}
      />
    </div>
  )
}
