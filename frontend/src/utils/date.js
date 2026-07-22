// Formata uma data para o formato YYYY-MM-DD usando o fuso horário LOCAL
// do navegador.
//
// NUNCA use `date.toISOString().split('T')[0]` para isso: toISOString()
// converte a data para UTC antes de formatar. Como o Brasil está atrás do
// UTC (ex.: UTC-3), à noite isso faz a data "pular" para o dia seguinte
// (ou, em outros fusos, voltar um dia), fazendo o filtro de "hoje" não
// bater com a data realmente gravada nas entregas.
export function toLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
