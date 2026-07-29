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

// Junta o endereço estruturado do Cliente (rua/numero/bairro/cidade/
// complemento) numa única string de exibição — o cadastro guarda os campos
// separados, mas a tabela de Clientes mostra só uma coluna "Endereço".
export function formatarEndereco(cliente) {
  if (!cliente) return '—'
  const { rua, numero, bairro, cidade, complemento } = cliente
  const linha1 = [rua, numero].filter(Boolean).join(', ')
  const linha2 = [bairro, cidade].filter(Boolean).join(', ')
  const partes = [linha1, linha2].filter(Boolean)
  const base = partes.join(' - ') || '—'
  return complemento ? `${base} (${complemento})` : base
}
