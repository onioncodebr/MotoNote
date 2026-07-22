export function formatarMoeda(valor) {
  return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`
}

export function formatarData(isoDate) {
  return new Date(isoDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// Pra timestamps reais (ex.: data/hora de criação da conta) — ao contrário de
// formatarData, não fixa UTC: mostra no fuso horário local de quem está vendo.
export function formatarDataHora(instant) {
  if (!instant) return '—'
  return new Date(instant).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
