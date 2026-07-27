// Duração da transição de entrada/saída dos modais (ver .ReactModal__Content
// e .ReactModal__Overlay em App.css). Precisa bater com o tempo real da
// animação CSS: closeTimeoutMS é o que segura o react-modal montado tempo
// suficiente pra tocar a transição de saída antes de desmontar de vez.
export const MODAL_CLOSE_TIMEOUT_MS = 200

// react-modal monta seu portal direto em document.body por padrão — fora da
// árvore de .dashboard-shell, onde a cor de destaque escolhida (Configurações
// → Aparência) é aplicada (:root[data-accent=X] .dashboard-shell em
// index.css, de propósito escopado assim pra não recolorir a área pública/
// landing). Sem isso, todo modal caía de volta pro laranja padrão do :root,
// ignorando a cor que o usuário escolheu. Todos os modais do app só existem
// dentro do Dashboard logado, então montar o portal ali dentro resolve sem
// precisar desescopar a cor de destaque (o document.body é só um fallback
// pro caso (improvável) do seletor não existir ainda quando o Modal montar).
export function modalParentSelector() {
  return document.querySelector('.dashboard-shell') || document.body
}

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
      // Sem isso, overflowY:'auto' sozinho faz o overflow-x efetivo também
      // virar 'auto' (regra da spec de CSS) — um título/texto longo sem
      // quebra força o conteúdo mais largo que a caixa e aparece um scroll
      // lateral dentro do modal. wordBreak garante que uma palavra/URL
      // única e longa (sem espaço) quebre em vez de estourar a largura.
      overflowX: 'hidden',
      wordBreak: 'break-word',
    },
    overlay: {
      backgroundColor: 'var(--dash-overlay)',
      zIndex: 60,
    },
  }
}
