import { useEffect, useState } from 'react'
import { Users, Bike, Package, Wallet, Activity, TrendingUp, AlertTriangle, PackageOpen, Eye, UserPlus } from 'lucide-react'
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

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

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
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Visão geral do SaaS</strong>
          <span>Indicadores consolidados de todos os clientes da plataforma.</span>
        </div>
      </div>

      {isLoading ? (
        <div className="metric-grid grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[var(--space-4)] mb-[var(--space-6)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px" key={i}>
              <div className="flex justify-between items-start"><Skeleton width={30} height={30} radius="7px" /></div>
              <Skeleton width={100} height={11} style={{ marginTop: 18 }} />
              <Skeleton width={70} height={22} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="metric-grid grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[var(--space-4)] mb-[var(--space-6)]">
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon blue-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Users size={16} /></span></div>
              <small>USUÁRIOS (TENANTS)</small>
              <strong>{totalUsuarios}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon green-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Activity size={16} /></span></div>
              <small>ATIVOS AGORA (15 MIN)</small>
              <strong>{metricas?.usuariosAtivosAgora ?? 0}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon purple-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Bike size={16} /></span></div>
              <small>MOTOBOYS NO SISTEMA</small>
              <strong>{metricas?.totalMotoboys ?? 0}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon green-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Package size={16} /></span></div>
              <small>ENTREGAS PROCESSADAS</small>
              <strong>{metricas?.totalEntregas ?? 0}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon yellow-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Wallet size={16} /></span></div>
              <small>MRR ESTIMADO</small>
              <strong>{formatarMoeda(metricas?.mrr)}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon blue-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><TrendingUp size={16} /></span></div>
              <small>CONVERSÃO TRIAL → PAGO</small>
              <strong>{(metricas?.taxaConversaoTrial ?? 0).toFixed(1)}%</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon purple-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Eye size={16} /></span></div>
              <small>VISITAS À LANDING PAGE</small>
              <strong>{metricas?.totalVisitasLanding ?? 0}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon yellow-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><UserPlus size={16} /></span></div>
              <small>VISITAS À PÁGINA DE CADASTRO</small>
              <strong>{metricas?.totalVisitasCadastro ?? 0}</strong>
            </div>
          </div>
          <p className="-mt-[14px] mb-[var(--space-6)] mx-0 text-[var(--dash-text-faint)] text-[length:var(--fs-xs)] leading-[1.5]">
            "Ativos agora" considera quem fez alguma ação nos últimos 15 minutos. "Conversão trial → pago" é um retrato do momento atual (ativos ÷ quem já saiu de "sem assinatura"), não acompanha coortes ao longo do tempo.
          </p>

          <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
            <div className="panel-header flex flex-wrap justify-between items-start gap-3">
              <div>
                <h2>Distribuição por status de assinatura</h2>
                <p>Todos os tenants cadastrados</p>
              </div>
            </div>
            {statusComValor.length > 0 ? (
              <div className="flex flex-wrap items-center gap-6 mt-[36px] mb-[10px]">
                <div className="w-32 h-32 flex-shrink-0 rounded-full" style={{ background: gradienteDonut }} />
                <div className="grid gap-3 flex-1 min-w-[160px]">
                  <div>
                    <strong className="block font-bold text-[1.25rem] text-[var(--dash-text-strong)]">{totalUsuarios}</strong>
                    <small className="block text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">tenants</small>
                  </div>
                  {statusComValor.map(([status, valor], i) => (
                    <span key={status} className="flex items-center text-[var(--dash-text-body)] text-[length:var(--fs-xs)]">
                      <i className="dot" style={{ background: CORES_DONUT[i % CORES_DONUT.length] }} />
                      {STATUS_LABELS[status] || status}
                      <b className="ml-auto text-[var(--dash-text-strong)] font-semibold">{valor}</b>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><Users size={22} />Nenhum usuário cadastrado ainda.</div>
            )}
          </div>

          <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
            <div className="panel-header flex flex-wrap justify-between items-start gap-3">
              <div>
                <h2>Crescimento da plataforma</h2>
                <p>Últimos {DIAS_JANELA} dias</p>
              </div>
            </div>
            <div className="flex flex-col gap-6 mt-[18px]">
              <div className="chart-block">
                <small className="flex items-center gap-[6px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] font-semibold tracking-[0.3px] uppercase"><i className="dot green" /> Novos cadastros por dia</small>
                <div className="flex h-[150px] mt-[10px]">
                  <div className="w-[30px] flex flex-col justify-between pb-[25px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                    <span>{maiorCadastros}</span>
                    <span>{Math.round(maiorCadastros / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between"><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /></div>
                    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full h-[calc(100%-25px)] overflow-visible">
                      <polyline points={pontosCadastros} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
                    </svg>
                    <div className="absolute bottom-0 inset-x-0 flex text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                      {cadastrosPorDia.map((p, i) => (
                        <span key={p.data} className="flex-1 text-center overflow-hidden first:text-left last:text-right">{rotuloEixoX(p.data, i, cadastrosPorDia.length)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-block">
                <small className="flex items-center gap-[6px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] font-semibold tracking-[0.3px] uppercase"><i className="dot blue" /> Entregas processadas por dia</small>
                <div className="flex h-[150px] mt-[10px]">
                  <div className="w-[30px] flex flex-col justify-between pb-[25px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                    <span>{maiorEntregas}</span>
                    <span>{Math.round(maiorEntregas / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between"><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /></div>
                    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full h-[calc(100%-25px)] overflow-visible">
                      <polyline points={pontosEntregas} fill="none" stroke="var(--chart-2)" strokeWidth="2" />
                    </svg>
                    <div className="absolute bottom-0 inset-x-0 flex text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                      {entregasPorDia.map((p, i) => (
                        <span key={p.data} className="flex-1 text-center overflow-hidden first:text-left last:text-right">{rotuloEixoX(p.data, i, entregasPorDia.length)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] mt-[14px]">
            <div className="panel-header flex flex-wrap justify-between items-start gap-3">
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
                  <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhuma entrega no período.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
