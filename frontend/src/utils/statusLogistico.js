// Rótulos e classes de badge do fluxo logístico da entrega (No
// estabelecimento / Em rota / Não foi possível entregar / Entregue) —
// compartilhados entre EntregasView e EntregasPendentesView. Ver
// fluxo-entrega-configuracoes.md. NA_LOJA é só a chave do enum (igual ao
// backend) — o rótulo exibido mudou pra "No estabelecimento".
export const STATUS_LOGISTICO_LABELS = {
  NA_LOJA: 'No estabelecimento',
  EM_ROTA: 'Em rota',
  NAO_ENTREGUE: 'Não foi possível entregar',
  ENTREGUE: 'Entregue',
}

export const STATUS_LOGISTICO_CLASSES = {
  NA_LOJA: 'plan-badge warning',
  EM_ROTA: 'plan-badge warning',
  NAO_ENTREGUE: 'plan-badge danger',
  ENTREGUE: 'plan-badge success',
}
