// Rótulos e classes de badge para o status de assinatura (StatusAssinatura no
// backend), compartilhados entre AssinaturaView, ConfiguracoesView e UsuariosView.
export const STATUS_LABELS = {
  TRIALING: 'Período de teste',
  ATIVA: 'Ativa',
  INADIMPLENTE: 'Pagamento pendente',
  CANCELADA: 'Cancelada',
  INCOMPLETA: 'Processando',
  SEM_ASSINATURA: 'Sem assinatura',
}

export const STATUS_CLASSES = {
  TRIALING: 'plan-badge info',
  ATIVA: 'plan-badge success',
  INADIMPLENTE: 'plan-badge danger',
  CANCELADA: 'plan-badge neutral',
  INCOMPLETA: 'plan-badge warning',
  SEM_ASSINATURA: 'plan-badge neutral',
}
