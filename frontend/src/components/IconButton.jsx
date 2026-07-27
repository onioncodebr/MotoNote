// boxSize cobre as duas variantes hoje usadas no app: o botão padrão de 30px
// (cabeçalho de modal) e o de 24px dentro do toast (ver Toast.jsx) — evita
// misturar w-[30px]/w-6 no mesmo className, que teriam especificidade igual
// e ordem de sobrescrita imprevisível no CSS gerado pelo Tailwind.
const BOX_SIZES = {
  md: 'w-[30px] h-[30px]',
  sm: 'w-6 h-6',
}

export function IconButton({ icon: Icon, size = 18, boxSize = 'md', className = '', ...props }) {
  return (
    <button
      type="button"
      // A classe "icon-button" não carrega estilo próprio (visual é 100% via
      // utilitários Tailwind acima) — existe só como gancho pra media query
      // de @media (pointer: coarse) em App.css, que aumenta o alvo de toque
      // em telas sensíveis ao toque sem mexer no tamanho pra mouse/desktop.
      className={`icon-button ${BOX_SIZES[boxSize]} inline-flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--dash-text-faint)] cursor-pointer transition-colors duration-150 ease-[var(--ease-out)] hover:bg-[var(--dash-muted-bg)] hover:text-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-focus-border)] focus-visible:outline-offset-2 ${className}`}
      {...props}
    >
      <Icon size={size} />
    </button>
  )
}
