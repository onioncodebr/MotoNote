import { toLocalIsoDate } from './date'

export const PERIODOS = {
  hoje: { label: 'Hoje' },
  ontem: { label: 'Ontem' },
  semana: { label: 'Essa semana' },
  mes: { label: 'Esse mês' },
  personalizado: { label: 'Período personalizado' },
}

// Períodos extras usados em Relatórios (ver RelatoriosView.jsx) — "dia" e
// "personalizado" não entram aqui porque dependem de um valor digitado
// pelo usuário (não dá pra calcular sozinho como os presets abaixo).
export const PERIODOS_RELATORIO = {
  semana: { label: 'Essa semana' },
  semana_passada: { label: 'Semana passada' },
  mes: { label: 'Esse mês' },
  dia: { label: 'Um dia específico' },
  personalizado: { label: 'Um período específico' },
}

// personalizado: { startDate, endDate } digitados pelo usuário — só usado
// quando periodo === 'personalizado' (os outros presets são calculados
// sozinhos a partir de hoje e ignoram esse segundo parâmetro).
export function getIntervaloPeriodo(periodo, personalizado) {
  const hoje = new Date()

  if (periodo === 'personalizado') {
    return { startDate: personalizado?.startDate || '', endDate: personalizado?.endDate || '' }
  }

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

  if (periodo === 'semana_passada') {
    // Domingo a sábado da semana anterior à atual (não relativa a hoje
    // dentro da semana, sempre a semana cheia que passou).
    const diaSemana = hoje.getDay()
    const inicioEstaSemana = new Date(hoje)
    inicioEstaSemana.setDate(hoje.getDate() - diaSemana)
    const fimSemanaPassada = new Date(inicioEstaSemana)
    fimSemanaPassada.setDate(inicioEstaSemana.getDate() - 1)
    const inicioSemanaPassada = new Date(fimSemanaPassada)
    inicioSemanaPassada.setDate(fimSemanaPassada.getDate() - 6)
    return { startDate: toLocalIsoDate(inicioSemanaPassada), endDate: toLocalIsoDate(fimSemanaPassada) }
  }

  // mes: do dia 1 do mês corrente até hoje.
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return { startDate: toLocalIsoDate(inicioMes), endDate: toLocalIsoDate(hoje) }
}
