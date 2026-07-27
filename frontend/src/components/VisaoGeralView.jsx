import { useEffect, useState } from 'react'
import { Package, Wallet, Bike, Receipt, Banknote, Fuel, HandCoins, PiggyBank, ChevronRight, AlertTriangle, PackageOpen } from 'lucide-react'
import { getMotoboyRelatorio, getMotoboyResumo, getMotoboyResumoGastos, getMotoboyResumoVales, getMotoboys, getReport, getResumo, getResumoPendentes, getResumoGastos, getResumoVales } from '../services/api'
import { toLocalIsoDate } from '../utils/date'
import { PERIODOS, getIntervaloPeriodo } from '../utils/periodo'
import { formatarMoeda } from '../utils/format'
import { Skeleton, SkeletonRow } from './Skeleton'

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
  const [resumoPendentes, setResumoPendentes] = useState(null)
  const [resumoGastos, setResumoGastos] = useState(null)
  const [resumoVales, setResumoVales] = useState(null)
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
          const [entregasData, resumoData, graficoAtualData, resumoGastosData, resumoValesData] = await Promise.all([
            getMotoboyRelatorio(startDate, endDate),
            getMotoboyResumo(startDate, endDate),
            getMotoboyRelatorio(toLocalIsoDate(graficoAtual.inicio), toLocalIsoDate(graficoAtual.fim)),
            getMotoboyResumoGastos(startDate, endDate),
            getMotoboyResumoVales(startDate, endDate),
          ])
          if (cancelado) return
          setEntregas(entregasData || [])
          setMotoboys([])
          setResumo(resumoData)
          setEntregasGraficoAtual(graficoAtualData || [])
          setResumoGastos(resumoGastosData)
          setResumoVales(resumoValesData)
          return
        }

        // O endpoint de resumo não aceita filtro por motoboy — com um motoboy
        // selecionado, os totais dos cards vêm do fallback local (linha ~95),
        // calculado em cima da lista de entregas já filtrada.
        const [entregasData, motoboysData, resumoData, graficoAtualData, resumoPendentesData, resumoGastosData, resumoValesData] = await Promise.all([
          getReport(startDate, endDate, motoboyId || undefined),
          getMotoboys(),
          motoboyId ? Promise.resolve(null) : getResumo(startDate, endDate),
          getReport(toLocalIsoDate(graficoAtual.inicio), toLocalIsoDate(graficoAtual.fim), motoboyId || undefined),
          getResumoPendentes(startDate, endDate, motoboyId || undefined),
          getResumoGastos(startDate, endDate, motoboyId || undefined),
          getResumoVales(startDate, endDate, motoboyId || undefined),
        ])
        if (cancelado) return
        setEntregas(entregasData || [])
        setMotoboys(motoboysData || [])
        setResumo(resumoData)
        setEntregasGraficoAtual(graficoAtualData || [])
        setResumoPendentes(resumoPendentesData)
        setResumoGastos(resumoGastosData)
        setResumoVales(resumoValesData)
      } catch (err) {
        if (!cancelado) setError(err.message || 'Não foi possível carregar os dados da visão geral.')
      } finally {
        if (!cancelado) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelado = true }
  }, [periodo, motoboyId, escopoProprio])

  if (error) return <div className="view-error flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)] text-[var(--color-danger)]"><AlertTriangle size={22} />{error}</div>

  const motoboyNameById = Object.fromEntries(motoboys.map((m) => [m.id, m.name]))

  const totalEntregas = resumo?.quantidadeEntregas ?? entregas.length
  const valorTotal = resumo?.valorTotal ?? entregas.reduce((sum, e) => sum + e.value, 0)
  const motoboysAtivos = motoboys.length
  const ticketMedio = totalEntregas > 0 ? valorTotal / totalEntregas : 0
  const valorPendente = resumoPendentes?.valorTotal ?? 0
  const valorGastos = resumoGastos?.valorTotal ?? 0
  const valorVales = resumoVales?.valorTotal ?? 0
  // Duas variantes de líquido: uma só desconta os vales (adiantamento/
  // desconto de motoboy), outra desconta vales + gastos operacionais
  // (combustível, manutenção etc) do período.
  const faturamentoLiquidoVales = valorTotal - valorVales
  const faturamentoLiquidoTotal = valorTotal - valorVales - valorGastos

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
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Visão geral</strong>
          <span>Confira os principais indicadores da sua operação.</span>
        </div>
        <div className="flex flex-wrap gap-[10px] max-[650px]:w-full">
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
          <div className="metric-grid grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[var(--space-4)] mb-[var(--space-6)]">
            {Array.from({ length: escopoProprio ? 7 : 9 }).map((_, i) => (
              <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px" key={i}>
                <div className="flex justify-between items-start"><Skeleton width={30} height={30} radius="7px" /></div>
                <Skeleton width={100} height={11} style={{ marginTop: 18 }} />
                <Skeleton width={70} height={22} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          {escopoProprio ? (
            <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
              <Skeleton width="35%" height={16} />
              <div className="flex h-[210px] mt-[28px]" style={{ alignItems: 'flex-end' }}>
                <Skeleton width="100%" height={170} />
              </div>
            </div>
          ) : (
            <>
              <div className="analytics-grid grid grid-cols-[1.6fr_1fr] max-[1080px]:grid-cols-1 gap-[var(--space-4)]">
                <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
                  <Skeleton width="35%" height={16} />
                  <div className="flex h-[210px] mt-[28px]" style={{ alignItems: 'flex-end' }}>
                    <Skeleton width="100%" height={170} />
                  </div>
                </div>
                <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] min-h-[290px]">
                  <Skeleton width="45%" height={16} />
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '36px 0' }}>
                    <Skeleton width={128} height={128} radius="50%" />
                  </div>
                </div>
              </div>
              <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] mt-[14px]">
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
          <div className="metric-grid grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[var(--space-4)] mb-[var(--space-6)]">
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon green-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Package size={16} /></span></div>
              <small>ENTREGAS NO PERÍODO</small>
              <strong>{totalEntregas}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon blue-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Wallet size={16} /></span></div>
              <small>FATURAMENTO NO PERÍODO</small>
              <strong>{formatarMoeda(valorTotal)}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon green-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><PiggyBank size={16} /></span></div>
              <small>LÍQUIDO (VALES)</small>
              <strong>{formatarMoeda(faturamentoLiquidoVales)}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon green-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><PiggyBank size={16} /></span></div>
              <small>LÍQUIDO (VALES + GASTOS)</small>
              <strong>{formatarMoeda(faturamentoLiquidoTotal)}</strong>
            </div>
            {!escopoProprio && (
              <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
                <div className="flex justify-between items-start"><span className="metric-icon purple-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Bike size={16} /></span></div>
                <small>MOTOBOYS ATIVOS</small>
                <strong>{motoboysAtivos}</strong>
              </div>
            )}
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon yellow-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Receipt size={16} /></span></div>
              <small>TICKET MÉDIO</small>
              <strong>{formatarMoeda(ticketMedio)}</strong>
            </div>
            {!escopoProprio && (
              <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
                <div className="flex justify-between items-start"><span className="metric-icon red-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Banknote size={16} /></span></div>
                <small>VALORES PENDENTES</small>
                <strong>{formatarMoeda(valorPendente)}</strong>
              </div>
            )}
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon yellow-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><Fuel size={16} /></span></div>
              <small>GASTOS</small>
              <strong>{formatarMoeda(valorGastos)}</strong>
            </div>
            <div className="metric-card border border-[var(--dash-border)] bg-[var(--dash-surface)] rounded-[var(--radius-md)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow,transform] duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-px">
              <div className="flex justify-between items-start"><span className="metric-icon purple-bg w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-sm)] text-[length:var(--fs-base)]"><HandCoins size={16} /></span></div>
              <small>VALES</small>
              <strong>{formatarMoeda(valorVales)}</strong>
            </div>
          </div>

          {(() => {
            const painelGrafico = (
              <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
                <div className="panel-header flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h2>Entregas por dia</h2>
                    <p>{isMensal ? 'Este mês' : 'Essa semana'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-6 mt-[18px]">
                  <div className="chart-block">
                    <small className="flex items-center gap-[6px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] font-semibold tracking-[0.3px] uppercase"><i className="dot green" /> Quantidade de entregas</small>
                    <div className="flex h-[150px] mt-[10px]">
                      <div className="w-[30px] flex flex-col justify-between pb-[25px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                        <span>{maiorQuantidade}</span>
                        <span>{Math.round(maiorQuantidade / 2)}</span>
                        <span>0</span>
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between"><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /></div>
                        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full h-[calc(100%-25px)] overflow-visible">
                          <polyline points={pontosQuantidade} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
                        </svg>
                        <div className="absolute bottom-0 inset-x-0 flex text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                          {seriePorDia.map((d, i) => (
                            <span key={i} className="flex-1 text-center overflow-hidden first:text-left last:text-right">{rotuloEixoX(d.data, i, seriePorDia.length, isMensal)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="chart-block">
                    <small className="flex items-center gap-[6px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] font-semibold tracking-[0.3px] uppercase"><i className="dot blue" /> Faturamento</small>
                    <div className="flex h-[150px] mt-[10px]">
                      <div className="w-[46px] flex flex-col justify-between pb-[25px] text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                        <span>{formatarMoedaCompacta(maiorValorDia)}</span>
                        <span>{formatarMoedaCompacta(maiorValorDia / 2)}</span>
                        <span>R$ 0</span>
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between"><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /><i className="block border-t border-dashed border-[var(--dash-border)]" /></div>
                        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full h-[calc(100%-25px)] overflow-visible">
                          <polyline points={pontosValor} fill="none" stroke="var(--chart-2)" strokeWidth="2" />
                        </svg>
                        <div className="absolute bottom-0 inset-x-0 flex text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">
                          {seriePorDia.map((d, i) => (
                            <span key={i} className="flex-1 text-center overflow-hidden first:text-left last:text-right">{rotuloEixoX(d.data, i, seriePorDia.length, isMensal)}</span>
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
              <div className="analytics-grid grid grid-cols-[1.6fr_1fr] max-[1080px]:grid-cols-1 gap-[var(--space-4)]">
                {painelGrafico}

                <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] min-h-[290px]">
                  <div className="panel-header flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h2>Distribuição por motoboy</h2>
                      <p>Participação no faturamento</p>
                    </div>
                  </div>
                  {top4.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-6 mt-[36px] mb-[10px]">
                      <div className="w-32 h-32 flex-shrink-0 rounded-full" style={{ background: gradienteDonut }} />
                      <div className="grid gap-3 flex-1 min-w-[160px]">
                        <div>
                          <strong className="block font-bold text-[1.25rem] text-[var(--dash-text-strong)]">{formatarMoeda(somaTop4)}</strong>
                          <small className="block text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)]">top {top4.length}</small>
                        </div>
                        {top4.map(([id, valor], i) => (
                          <span key={id} className="flex items-center text-[var(--dash-text-body)] text-[length:var(--fs-xs)]">
                            <i className={`dot ${['green', 'blue', 'orange', 'purple'][i]}`} />
                            {motoboyNameById[id] || 'Motoboy removido'}
                            <b className="ml-auto text-[var(--dash-text-strong)] font-semibold">{formatarMoeda(valor)}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhuma entrega no período.</div>
                  )}
                </div>
              </div>
            )
          })()}

          {!escopoProprio && (
            <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] mt-[14px]">
              <div className="panel-header flex flex-wrap justify-between items-start gap-3">
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
                    <div className="empty-state flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]"><PackageOpen size={22} />Nenhuma entrega registrada no período selecionado.</div>
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
