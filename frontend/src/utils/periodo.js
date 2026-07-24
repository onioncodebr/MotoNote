import { toLocalIsoDate } from './date'

export const PERIODOS = {
  hoje: { label: 'Hoje' },
  ontem: { label: 'Ontem' },
  semana: { label: 'Essa semana' },
  mes: { label: 'Esse mês' },
}

export function getIntervaloPeriodo(periodo) {
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
