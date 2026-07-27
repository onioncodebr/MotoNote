// "as" existe porque .button hoje estiliza tanto <button> (maioria) quanto
// <a> (CTA de WhatsApp na landing) — em vez de duplicar o componente, deixa
// o consumidor escolher a tag e passa o resto (href, onClick, type, disabled
// etc.) direto via props, sem inventar uma API própria.
// dark/light usam var(--ink)/branco fixos (não var(--dash-*)) de propósito:
// só aparecem na landing/login, que é sempre clara. outline já usa
// var(--dash-text-strong)/var(--dash-border) porque também renderiza dentro
// de modais (react-modal usa portal pra document.body, fora da árvore do
// .dashboard-shell) — os tokens --dash-* são redefinidos direto em
// :root[data-theme="dark"] (não dependem de estar dentro do
// .dashboard-shell), então resolvem tema escuro nos dois contextos.
const VARIANT_CLASSES = {
  dark: 'border-0 bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-strong)]',
  light: 'border-0 bg-white text-[var(--ink)]',
  outline: 'border border-[var(--dash-border)] bg-transparent text-[var(--dash-text-strong)]',
  // Cor e sombra de hover vêm de --color-danger-strong(-rgb): mesmos tokens
  // que o resto do app usa pra vermelho de erro/exclusão.
  danger: 'border-0 bg-[var(--color-danger-strong)] text-white hover:shadow-[0_10px_22px_rgba(var(--color-danger-strong-rgb),0.3)]',
}

const SIZE_CLASSES = {
  normal: 'px-[22px] py-[14px] text-[length:var(--fs-sm)]',
  small: 'px-4 py-[11px] text-[length:var(--fs-xs)]',
}

export function Button({
  as: Tag = 'button',
  variant = 'dark',
  size = 'normal',
  full = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      // A classe "button" não carrega estilo próprio — é só um gancho pros
      // seletores contextuais que ainda vivem em App.css (.landing-nav
      // .button, .hero-actions .button, .contact-banner .button e o
      // white-space:normal de telefone), que continuam funcionando sem
      // precisar migrar o layout inteiro da landing agora.
      className={`button inline-flex items-center rounded-[var(--radius-pill)] font-semibold leading-[1.2] whitespace-nowrap transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-focus-border)] focus-visible:outline-offset-2 [&>svg:first-child]:mr-2 [&_span]:ml-3 [&_span]:inline-flex [&_span]:items-center [&_span]:transition-transform [&_span]:duration-[var(--duration-base)] [&_span]:ease-[var(--ease-out)] hover:[&_span]:translate-x-0.5 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${full ? 'w-full mt-[3px] justify-center disabled:cursor-wait disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
