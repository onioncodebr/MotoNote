import { useEffect, useState } from 'react'
import { Package, Wallet, Bike, Receipt, ChevronRight, AlertTriangle, PackageOpen } from 'lucide-react'
import { getMotoboyRelatorio, getMotoboyResumo, getMotoboys, getReport, getResumo } from '../services/api'
import { toLocalIsoDate } from '../utils/date'
import { formatarMoeda } from '../utils/format'
import { Skeleton, SkeletonRow } from './Skeleton'

const PERIODOS = {
  hoje: { label: 'Hoje' },
  ontem: { label: 'Ontem' },
  semana: { label: 'Essa semana' },
  mes: { label: 'Esse mês' },
}

// Mesmas cores da legenda/CSS (.dot.green/blue/orange/purple em App.css),
// lidas via var() para ter uma única fonte de verdade entre JS e CSS.
const CORES_DONUT = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const NOMES_DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Os gráficos de "Entregas por dia" são independentes do filtro de período
// dos cards acima: mostram sempre a semana corrente (domingo a sábado),
// exceto no filtro "Esse mês", onde acompanham o mês corrente (dia 1 até hoje).
function getIntervaloGraficoAtual(periodo) {
  const hoje = new Date()
  if (periodo === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { inicio, fim: hoje }
  }
  const diaSemana = hoje.getDay() // 0 = domingo ... 6 = sábado
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - diaSemana)
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)
  return { inicio, fim }
}

function getDiasDoIntervalo(inicio, fim) {
  const dias = []
  const cursor = new Date(inicio)
  while (cursor <= fim) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

// Normaliza uma série de valores (0..máximo) pro espaço 0-100 do viewBox do
// SVG, já no formato "x,y x,y ..." aceito pelo atributo points de <polyline>
// — mesmo estilo de gráfico simples usado no preview da landing page.
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

function rotuloEixoX(data, i, total, isMensal) {
  if (!isMensal) return NOMES_DIAS_SEMANA[data.getDay()]
  const dia = data.getDate()
  return i === 0 || i === total - 1 || dia % 5 === 0 ? String(dia) : ''
}

function getIntervaloPeriodo(periodo) {
  const hoje = new Date()

  if (periodo === 'hoje') {
    return { startDate: toLocalIsoDate(hoje), endDate: toLocalIsoDate(hoje) }
  }

  if (periodo === 'ontem') {
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)
    return { startDate: toLocalIsoDate(ontem), endDate: toLocalIsoDate(ontem) }
  }

  if (periodo === 'semana') {
    // Semana começando no domingo até hoje.
    const diaSemana = hoje.getDay() // 0 = domingo ... 6 = sábado
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana)
    return { startDate: toLocalIsoDate(inicio), endDate: toLocalIsoDate(hoje) }
  }

  // mes: do dia 1 do mês corrente até hoje.
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return { startDate: toLocalIsoDate(inicioMes), endDate: toLocalIsoDate(hoje) }
}

// Rótulo compacto pro eixo de faturamento do gráfico (a coluna é estreita
// demais pro formato completo "R$ 1.234,56").
function formatarMoedaCompacta(valor) {
  const v = valor || 0
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
  return `R$ ${Math.round(v)}`
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

// escopoProprio: modo do portal do motoboy — indicadores e gráficos só das
// próprias entregas, sem seletor de motoboy nem os painéis de comparação
// entre motoboys (que não fazem sentido pra quem só vê os próprios dados).
export function VisaoGeralView({ user, escopoProprio = false }) {
  const [periodo, setPeriodo] = useState('hoje')
  const [motoboyId, setMotoboyId] = useState('')
  const [entregas, setEntregas] = useState([])
  const [entregasGraficoAtual, setEntregasGraficoAtual] = useState([])
  const [motoboys, setMotoboys] = useState([])
  const [resumo, setResumo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function fetchData() {
      try {
        setIsLoading(true)
        setError('')
        const { startDate, endDate } = getIntervaloPeriodo(periodo)
        const graficoAtual = getIntervaloGraficoAtual(periodo)

        if (escopoProprio) {
          const [entregasData, resumoData, graficoAtualData] = await Promise.all([
            getMotoboyRelatorio(startDate, endDate),
            getMotoboyResumo(startDate, endDate),
            getMotoboyRelatorio(toLocalIsoDate(graficoAtual.inicio), toLocalIsoDate(graficoAtual.fim)),
          ])
          if (cancelado) return
          setEntregas(entregasData || [])
          setMotoboys([])
          setResumo(resumoData)
          setEntregasGraficoAtual(graficoAtualData || [])
          return
        }

        // O endpoint de resumo não aceita filtro por motoboy — com um motoboy
        // selecionado, os totais dos cards vêm do fallback local (linha ~95),
        // calculado em cima da lista de entregas já filtrada.
        const [entregasData, motoboysData, resumoData, graficoAtualData] = await Promise.all([
          getReport(startDate, endDate, motoboyId || undefined),
          getMotoboys(),
          motoboyId ? Promise.resolve(null) : getResumo(startDate, endDate),
          getReport(toLocalIsoDate(graficoAtual.inicio), toLocalIsoDate(graficoAtual.fim), motoboyId || undefined),
        ])
        if (cancelado) return
        setEntregas(entregasData || [])
        setMotoboys(motoboysData || [])
        setResumo(resumoData)
        setEntregasGraficoAtual(graficoAtualData || [])
      } catch (err) {
        if (!cancelado) setError(err.message || 'Não foi possível carregar os dados da visão geral.')
      } finally {
        if (!cancelado) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelado = true }
  }, [periodo, motoboyId, escopoProprio])

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))

  const totalEntregas = resumo?.quantidadeEntregas ?? entregas.length
  const valorTotal = resumo?.valorTotal ?? entregas.reduce((sum, e) => sum + e.value, 0)
  const motoboysAtivos = motoboys.length
  const ticketMedio = totalEntregas > 0 ? valorTotal / totalEntregas : 0

  // --- Série diária do gráfico (semana corrente, ou mês corrente se periodo === 'mes') ---
  const isMensal = periodo === 'mes'
  const graficoAtual = getIntervaloGraficoAtual(periodo)
  const diasGrafico = getDiasDoIntervalo(graficoAtual.inicio, graficoAtual.fim)
  const seriePorDia = diasGrafico.map((data) => {
    const chave = toLocalIsoDate(data)
    const entregasDoDia = entregasGraficoAtual.filter((e) => e.localDate === chave)
    return {
      data,
      quantidade: entregasDoDia.length,
      total: entregasDoDia.reduce((sum, e) => sum + e.value, 0),
    }
  })
  const maiorQuantidade = Math.max(1, ...seriePorDia.map((d) => d.quantidade))
  const pontosQuantidade = construirPontos(seriePorDia.map((d) => d.quantidade), maiorQuantidade)
  // Faturamento por dia tem escala própria (R$, não "quantidade").
  const maiorValorDia = Math.max(1, ...seriePorDia.map((d) => d.total))
  const pontosValor = construirPontos(seriePorDia.map((d) => d.total), maiorValorDia)

  // --- Distribuição de faturamento por motoboy (donut) ---
  const totalPorMotoboy = {}
  entregas.forEach((e) => {
    totalPorMotoboy[e.motoboyId] = (totalPorMotoboy[e.motoboyId] || 0) + e.value
  })
  const ranking = Object.entries(totalPorMotoboy).sort((a, b) => b[1] - a[1])
  const top4 = ranking.slice(0, 4)
  const somaTop4 = top4.reduce((sum, [, valor]) => sum + valor, 0)

  let cursor = 0
  const partesGradiente = top4.map(([, valor], i) => {
    const pct = valorTotal > 0 ? (valor / valorTotal) * 100 : 0
    const parte = `${CORES_DONUT[i]} ${cursor}% ${cursor + pct}%`
    cursor += pct
    return parte
  })
  if (cursor < 100) partesGradiente.push(`var(--chart-remainder) ${cursor}% 100%`)
  const gradienteDonut = top4.length > 0 ? `conic-gradient(${partesGradiente.join(', ')})` : undefined

  // --- Ranking de motoboys em destaque ---
  const motoboysDestaque = ranking.slice(0, 5).map(([id, valor]) => ({
    id,
    nome: motoboyNameById[id] || 'Motoboy removido',
    quantidade: entregas.filter((e) => e.motoboyId === id).length,
    total: valor,
  }))

  return (
    <>
      <div className="dashboard-toolbar">
        <div>
          <strong>Visão geral</strong>
          <span>Confira os principais indicadores da sua operação.</span>
        </div>
        <div className="toolbar-filters">
          {!escopoProprio && (
            <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)}>
              <option value="">Todos os motoboys</option>
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {Object.entries(PERIODOS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className={escopoProprio ? 'metric-grid metric-grid-3' : 'metric-grid'}>
            {Array.from({ length: escopoProprio ? 3 : 4 }).map((_, i) => (
              <div className="metric-card" key={i}>
                <div className="metric-top"><Skeleton width={30} height={30} radius="7px" /></div>
                <Skeleton width={100} height={11} style={{ marginTop: 18 }} />
                <Skeleton width={70} height={22} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          {escopoProprio ? (
            <div className="panel">
              <Skeleton width="35%" height={16} />
              <div className="big-chart" style={{ alignItems: 'flex-end' }}>
                <Skeleton width="100%" height={170} />
              </div>
            </div>
          ) : (
            <>
              <div className="analytics-grid">
                <div className="panel">
                  <Skeleton width="35%" height={16} />
                  <div className="big-chart" style={{ alignItems: 'flex-end' }}>
                    <Skeleton width="100%" height={170} />
                  </div>
                </div>
                <div className="panel riders-panel">
                  <Skeleton width="45%" height={16} />
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '36px 0' }}>
                    <Skeleton width={128} height={128} radius="50%" />
                  </div>
                </div>
              </div>
              <div className="panel recent-panel">
                <Skeleton width="30%" height={16} />
                <div className="table-scroll" style={{ marginTop: 17 }}>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={4} />)}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className={escopoProprio ? 'metric-grid metric-grid-3' : 'metric-grid'}>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon green-bg"><Package size={16} /></span></div>
              <small>ENTREGAS NO PERÍODO</small>
              <strong>{totalEntregas}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon blue-bg"><Wallet size={16} /></span></div>
              <small>FATURAMENTO NO PERÍODO</small>
              <strong>{formatarMoeda(valorTotal)}</strong>
            </div>
            {!escopoProprio && (
              <div className="metric-card">
                <div className="metric-top"><span className="metric-icon purple-bg"><Bike size={16} /></span></div>
                <small>MOTOBOYS ATIVOS</small>
                <strong>{motoboysAtivos}</strong>
              </div>
            )}
            <div className="metric-card">
              <div className="metric-top"><span className="metric-icon yellow-bg"><Receipt size={16} /></span></div>
              <small>TICKET MÉDIO</small>
              <strong>{formatarMoeda(ticketMedio)}</strong>
            </div>
          </div>

          {(() => {
            const painelGrafico = (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Entregas por dia</h2>
                    <p>{isMensal ? 'Este mês' : 'Essa semana'}</p>
                  </div>
                </div>
                <div className="chart-stack">
                  <div className="chart-block">
                    <small className="chart-block-label"><i className="dot green" /> Quantidade de entregas</small>
                    <div className="big-chart big-chart-sm">
                      <div className="y-axis">
                        <span>{maiorQuantidade}</span>
                        <span>{Math.round(maiorQuantidade / 2)}</span>
                        <span>0</span>
                      </div>
                      <div className="graph-area">
                        <div className="grid-lines"><i /><i /><i /></div>
                        <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                          <polyline points={pontosQuantidade} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
                        </svg>
                        <div className="x-axis">
                          {seriePorDia.map((d, i) => (
                            <span key={i}>{rotuloEixoX(d.data, i, seriePorDia.length, isMensal)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="chart-block">
                    <small className="chart-block-label"><i className="dot blue" /> Faturamento</small>
                    <div className="big-chart big-chart-sm">
                      <div className="y-axis y-axis-currency">
                        <span>{formatarMoedaCompacta(maiorValorDia)}</span>
                        <span>{formatarMoedaCompacta(maiorValorDia / 2)}</span>
                        <span>R$ 0</span>
                      </div>
                      <div className="graph-area">
                        <div className="grid-lines"><i /><i /><i /></div>
                        <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                          <polyline points={pontosValor} fill="none" stroke="var(--chart-2)" strokeWidth="2" />
                        </svg>
                        <div className="x-axis">
                          {seriePorDia.map((d, i) => (
                            <span key={i}>{rotuloEixoX(d.data, i, seriePorDia.length, isMensal)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )

            if (escopoProprio) return painelGrafico

            return (
              <div className="analytics-grid">
                {painelGrafico}

                <div className="panel riders-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Distribuição por motoboy</h2>
                      <p>Participação no faturamento</p>
                    </div>
                  </div>
                  {top4.length > 0 ? (
                    <div className="donut-wrap">
                      <div className="donut" style={{ background: gradienteDonut }}>
                        <strong>{formatarMoeda(somaTop4)}</strong>
                        <small>top {top4.length}</small>
                      </div>
                      <div className="legend">
                        {top4.map(([id, valor], i) => (
                          <span key={id}>
                            <i className={`dot ${['green', 'blue', 'orange', 'purple'][i]}`} />
                            {motoboyNameById[id] || 'Motoboy removido'}
                            <b>{formatarMoeda(valor)}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state"><PackageOpen size={22} />Nenhuma entrega no período.</div>
                  )}
                </div>
              </div>
            )
          })()}

          {!escopoProprio && (
            <div className="panel recent-panel">
              <div className="panel-header">
                <div>
                  <h2>Motoboys em destaque</h2>
                  <p>Ranking por faturamento no período</p>
                </div>
              </div>
              <div className="riders-table">
                <div className="table-scroll">
                  {motoboysDestaque.length > 0 ? (
                    motoboysDestaque.map((m) => (
                      <div className="table-row" key={m.id}>
                        <span className="rider-avatar green">{iniciais(m.nome)}</span>
                        <strong>{m.nome}</strong>
                        <span className="delivery-count">{m.quantidade} entregas</span>
                        <span className="table-amount">{formatarMoeda(m.total)}</span>
                        <span className="row-arrow"><ChevronRight size={17} /></span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state"><PackageOpen size={22} />Nenhuma entrega registrada no período selecionado.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
