// Estilo compartilhado para todos os modais (react-modal) do app.
// Usa os tokens de tema (--dash-*) para funcionar corretamente tanto no
// modo claro quanto no escuro, mesmo o modal sendo renderizado via portal
// (fora da árvore do .dashboard-shell).
export function getModalStyles(width = 400) {
  return {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      border: '1px solid var(--dash-border)',
      borderRadius: 'var(--radius-md)',
      padding: '25px',
      width: `min(${width}px, 90%)`,
      background: 'var(--dash-surface)',
      color: 'var(--dash-text-strong)',
      maxHeight: '85vh',
      overflowY: 'auto',
    },
    overlay: {
      backgroundColor: 'var(--dash-overlay)',
      zIndex: 60,
    },
  }
}
