// Rótulos e classes de badge para forma de pagamento e status de recebimento
// da entrega, compartilhados entre EntregasView e ValoresPendentesView.
export const FORMA_PAGAMENTO_LABELS = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
}

export const STATUS_RECEBIMENTO_LABELS = {
  PENDENTE: 'Pendente',
  RECEBIDO: 'Recebido',
}

export const STATUS_RECEBIMENTO_CLASSES = {
  PENDENTE: 'plan-badge warning',
  RECEBIDO: 'plan-badge success',
}
