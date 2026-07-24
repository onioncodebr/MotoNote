import { useEffect, useState } from 'react'
import { Users, Bike, Package, Wallet, Activity, TrendingUp, AlertTriangle, PackageOpen } from 'lucide-react'
import { getMetricasMaster, getCadastrosPorDia, getEntregasPorDiaMaster, getRankingEmpresas } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { STATUS_LABELS } from '../utils/status'
import { Skeleton } from './Skeleton'

// Mesmas cores usadas no donut de VisaoGeralView (distribuição por
// motoboy) — aqui reaproveitadas pra distribuição por status de assinatura.
const CORES_DONUT = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-remainder)']

const DIAS_JANELA = 30

// Mesma técnica de VisaoGeralView.jsx (linha "construirPontos"): normaliza
// uma série de valores pro espaço 0-100 do viewBox do SVG.
function construirPontos(valores, maximo) {
  const n = valores.length
  return valores
    .map((v, i) => {
      const x = n > 1 ? (i / (n - 1)) * 300 : 150
      const y = 100 - (v / maximo) * 90
      return `${x},${y}`
    })
    .join(' ')
}

// Com 30 pontos, mostrar o dia de todo ponto ficaria ilegível — só o
// primeiro, o último e múltiplos de 5, igual ao modo "mensal" já usado em
// VisaoGeralView.jsx.
function rotuloEixoX(dataIso, i, total) {
  const dia = Number(dataIso.slice(8, 10))
  return i === 0 || i === total - 1 || dia % 5 === 0 ? String(dia) : ''
}

function iniciais(nome) {
  return (nome || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

// Visão geral do SaaS como um todo (todos os tenants), não de uma operação
// individual — sem seletor de período: é o estado atual do sistema (com
// exceção dos gráficos/ranking, que usam uma janela fixa de 30 dias).
export function VisaoGeralMasterView() {
  const [metricas, setMetricas] = useState(null)
  const [cadastrosPorDia, setCadastrosPorDia] = useState([])
  const [entregasPorDia, setEntregasPorDia] = useState([])
  const [ranking, setRanking] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    Promise.all([
      getMetricasMaster(),
      getCadastrosPorDia(DIAS_JANELA),
      getEntregasPorDiaMaster(DIAS_JANELA),
      getRankingEmpresas(DIAS_JANELA, 5),
    ])
      .then(([metricasData, cadastrosData, entregasData, rankingData]) => {
        if (cancelado) return
        setMetricas(metricasData)
        setCadastrosPorDia(cadastrosData || [])
        setEntregasPorDia(entregasData || [])
        setRanking(rankingData || [])
      })
      .catch((err) => { if (!cancelado) setError(err.message || 'Não foi possível carregar as métricas.') })
      .finally(() => { if (!cancelado) setIsLoading(false) })

    return () => { cancelado = true }
  }, [])

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  const usuariosPorStatus = metricas?.usuariosPorStatus || {}
  const statusComValor = Object.entries(usuariosPorStatus).filter(([, valor]) => valor > 0)
  const totalUsuarios = metricas?.totalUsuarios || 0

  let cursor = 0
  const partesGradiente = statusComValor.map(([status, valor], i) => {
    const pct = totalUsuarios > 0 ? (valor / totalUsuarios) * 100 : 0
    const parte = `${CORES_DONUT[i % CORES_DONUT.length]} ${cursor}% ${cursor + pct}%`
    cursor += pct
    return parte
  })
  const gradienteDonut = statusComValor.length > 0 ? `conic-gradient(${partesGradiente.join(', ')})` : undefined

  const maiorCadastros = Math.max(1, ...cadastrosPorDia.map((p) => p.quantidade))
  const pontosCadastros = construirPontos(cadastrosPorDia.map((p) => p.quantidade), maiorCadastros)
  const maiorEntregas = Math.max(1, ...entregasPorDia.map((p) => p.quantidade))
  const pontosEntregas = construirPontos(entregasPorDia.map((p) => p.quantidade), maiorEntregas)

  return (
    <>
      <div className="dashboard-toolbar">
        <div>
          <strong>Visão geral do SaaS</strong>
          <span>Indicadores consolidados de todos os clientes da plataforma.</span>
        </div>
      </div>

      {isLoading ? (
        <div className="metric-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="metric-card" key={i}>
              <div className="metric-top"><Skeleton width={30} height={30} radius="7px" /></div>
              <Skeleton width={100} height={11} style={{ marginTop: 18 }} />
              <Skeleton width={70} height={22} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon blue-bg"><Users size={16} /></span></div>
              <small>USUÁRIOS (TENANTS)</small>
              <strong>{totalUsuarios}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon green-bg"><Activity size={16} /></span></div>
              <small>ATIVOS AGORA (15 MIN)</small>
              <strong>{metricas?.usuariosAtivosAgora ?? 0}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon purple-bg"><Bike size={16} /></span></div>
              <small>MOTOBOYS NO SISTEMA</small>
              <strong>{metricas?.totalMotoboys ?? 0}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon green-bg"><Package size={16} /></span></div>
              <small>ENTREGAS PROCESSADAS</small>
              <strong>{metricas?.totalEntregas ?? 0}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon yellow-bg"><Wallet size={16} /></span></div>
              <small>MRR ESTIMADO</small>
              <strong>{formatarMoeda(metricas?.mrr)}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon blue-bg"><TrendingUp size={16} /></span></div>
              <small>CONVERSÃO TRIAL → PAGO</small>
              <strong>{(metricas?.taxaConversaoTrial ?? 0).toFixed(1)}%</strong>
            </div>
          </div>
          <p className="metric-grid-note">
            "Ativos agora" considera quem fez alguma ação nos últimos 15 minutos. "Conversão trial → pago" é um retrato do momento atual (ativos ÷ quem já saiu de "sem assinatura"), não acompanha coortes ao longo do tempo.
          </p>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Distribuição por status de assinatura</h2>
                <p>Todos os tenants cadastrados</p>
              </div>
            </div>
            {statusComValor.length > 0 ? (
              <div className="donut-wrap">
                <div className="donut" style={{ background: gradienteDonut }}>
                  <strong>{totalUsuarios}</strong>
                  <small>tenants</small>
                </div>
                <div className="legend">
                  {statusComValor.map(([status, valor], i) => (
                    <span key={status}>
                      <i className="dot" style={{ background: CORES_DONUT[i % CORES_DONUT.length] }} />
                      {STATUS_LABELS[status] || status}
                      <b>{valor}</b>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state"><Users size={22} />Nenhum usuário cadastrado ainda.</div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Crescimento da plataforma</h2>
                <p>Últimos {DIAS_JANELA} dias</p>
              </div>
            </div>
            <div className="chart-stack">
              <div className="chart-block">
                <small className="chart-block-label"><i className="dot green" /> Novos cadastros por dia</small>
                <div className="big-chart big-chart-sm">
                  <div className="y-axis">
                    <span>{maiorCadastros}</span>
                    <span>{Math.round(maiorCadastros / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="graph-area">
                    <div className="grid-lines"><i /><i /><i /></div>
                    <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                      <polyline points={pontosCadastros} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
                    </svg>
                    <div className="x-axis">
                      {cadastrosPorDia.map((p, i) => (
                        <span key={p.data}>{rotuloEixoX(p.data, i, cadastrosPorDia.length)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-block">
                <small className="chart-block-label"><i className="dot blue" /> Entregas processadas por dia</small>
                <div className="big-chart big-chart-sm">
                  <div className="y-axis">
                    <span>{maiorEntregas}</span>
                    <span>{Math.round(maiorEntregas / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="graph-area">
                    <div className="grid-lines"><i /><i /><i /></div>
                    <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                      <polyline points={pontosEntregas} fill="none" stroke="var(--chart-2)" strokeWidth="2" />
                    </svg>
                    <div className="x-axis">
                      {entregasPorDia.map((p, i) => (
                        <span key={p.data}>{rotuloEixoX(p.data, i, entregasPorDia.length)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel recent-panel">
            <div className="panel-header">
              <div>
                <h2>Empresas em destaque</h2>
                <p>Ranking por faturamento nos últimos {DIAS_JANELA} dias</p>
              </div>
            </div>
            <div className="riders-table">
              <div className="table-scroll">
                {ranking.length > 0 ? (
                  ranking.map((r) => (
                    <div className="table-row" key={r.emailEmpresa || r.nomeEmpresa}>
                      <span className="rider-avatar green">{iniciais(r.nomeEmpresa)}</span>
                      <strong>{r.nomeEmpresa}</strong>
                      <span className="delivery-count">{r.quantidadeEntregas} entregas</span>
                      <span className="table-amount">{formatarMoeda(r.faturamento)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state"><PackageOpen size={22} />Nenhuma entrega no período.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
