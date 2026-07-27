import { useEffect, useState } from 'react'
import { AlertTriangle, Bike, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { getMotoboysMasterPaged } from '../services/api'
import { exportMotoboysMasterToExcel } from '../services/exportService'
import { Button } from './Button'
import { SkeletonRow } from './Skeleton'

const PAGE_SIZE = 20
// Tamanho de página usado só pra varrer tudo na exportação (loop de
// páginas) — mesma técnica de UsuariosView/AssinaturasView.
const EXPORT_PAGE_SIZE = 100

// Listagem global (todos os tenants) — diferente de MotoboysView, que é
// escopada à empresa logada. Só leitura: gestão de um motoboy específico
// continua sendo feita pelo próprio dono da conta.
export function MotoboysMasterView() {
  const [motoboys, setMotoboys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const fetchMotoboys = async (pageToLoad, nome) => {
    try {
      setIsLoading(true)
      setError('')
      const data = await getMotoboysMasterPaged(pageToLoad, PAGE_SIZE, nome || undefined)
      setMotoboys(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
      setPage(pageToLoad)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os motoboys.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMotoboys(0, buscaAplicada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada])

  const handleSubmitBusca = (e) => {
    e.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const primeira = await getMotoboysMasterPaged(0, EXPORT_PAGE_SIZE, buscaAplicada || undefined)
      let todos = primeira?.content || []
      const totalPages = primeira?.totalPages || 0
      for (let p = 1; p < totalPages; p++) {
        const pagina = await getMotoboysMasterPaged(p, EXPORT_PAGE_SIZE, buscaAplicada || undefined)
        todos = todos.concat(pagina?.content || [])
      }
      await exportMotoboysMasterToExcel(todos)
    } catch (err) {
      setError(err.message || 'Não foi possível exportar os motoboys.')
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="motoboys-master-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Motoboys (todos os clientes)</strong>
          <span>Listagem global de motoboys cadastrados na plataforma.</span>
        </div>
        <form className="usuarios-toolbar-actions" onSubmit={handleSubmitBusca}>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar motoboy por nome"
          />
          <Button type="submit" variant="outline" size="small"><Search size={16} /> Buscar</Button>
          <Button type="button" variant="outline" size="small" onClick={handleExport} disabled={isExporting || pageInfo.totalElements === 0}>
            <Download size={16} /> {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </form>
      </div>

      <div className="panel">
        <div className="table-scroll" role="table" aria-label="Motoboys">
          <div className="table-header motoboys-master-table-header" role="row">
            <span role="columnheader">Nome</span>
            <span role="columnheader">E-mail</span>
            <span role="columnheader">Empresa</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={3} />)
          ) : motoboys.length > 0 ? (
            motoboys.map((motoboy) => (
              <div className="table-row motoboys-master-table-row" role="row" key={motoboy.id}>
                <strong className="cell-title" role="cell">{motoboy.name}</strong>
                <span role="cell" data-label="E-mail">{motoboy.email || '—'}</span>
                <span role="cell" data-label="Empresa">{motoboy.nomeEmpresa}</span>
              </div>
            ))
          ) : (
            <div className="empty-state"><Bike size={22} />{buscaAplicada ? 'Nenhum motoboy encontrado com esse nome.' : 'Nenhum motoboy cadastrado.'}</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => fetchMotoboys(Math.max(page - 1, 0), buscaAplicada)}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => fetchMotoboys(Math.min(page + 1, pageInfo.totalPages - 1), buscaAplicada)}
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
