import { Check, Sun, Moon } from 'lucide-react'

// Rótulo + amostra de cor (mesma cor que --brand-accent assume nesse tema,
// ver src/index.css) pro seletor de Aparência. "laranja" é o padrão de
// marca, sem override de CSS.
const ACCENT_OPTIONS = [
  { key: 'laranja', label: 'Laranja', swatch: '#ff5a1f' },
  { key: 'azul', label: 'Azul', swatch: '#2f6fed' },
  { key: 'vermelho', label: 'Vermelho', swatch: '#e0453f' },
  { key: 'roxo', label: 'Roxo', swatch: '#8b5cf6' },
  { key: 'preto-e-branco', label: 'Preto e Branco', swatch: '#2b2b2b' },
  { key: 'verde', label: 'Verde', swatch: '#3f9d5c' },
  { key: 'rosa', label: 'Rosa', swatch: '#ec4899' },
]

// Base comum dos dois botões de modo (claro/escuro) — só a cor de fundo/
// texto muda entre selecionado e não selecionado, calculada por fora em vez
// de misturar bg-transparent/bg-[var(--dash-muted-bg)] no mesmo className
// (mesma especificidade, ordem de sobrescrita imprevisível no Tailwind).
const TOGGLE_BUTTON = 'inline-flex items-center gap-[6px] border-0 rounded-[var(--radius-pill)] px-4 py-2 text-[length:var(--fs-xs)] font-semibold'

// Compartilhado entre ConfiguracoesView (dono da conta) e MotoboyContaView
// (portal do motoboy) — tema e cor de destaque valem pra qualquer papel
// logado, não é uma preferência exclusiva do dono.
export function AparenciaPanel({ theme, onToggleTheme, accentColor, onAccentChange }) {
  return (
    <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] col-span-full">
      <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2>Aparência</h2></div>

      <div className="mt-1">
        <small className="block text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] tracking-[0.3px] mb-[10px]">MODO</small>
        <div className="inline-flex border border-[var(--dash-border)] rounded-[var(--radius-pill)] p-[3px] gap-[3px]">
          <button
            type="button"
            className={`${TOGGLE_BUTTON} ${theme === 'light' ? 'bg-[var(--dash-muted-bg)] text-[var(--dash-text-strong)]' : 'bg-transparent text-[var(--dash-text-muted)]'}`}
            onClick={() => theme !== 'light' && onToggleTheme()}
          >
            <Sun size={15} /> Claro
          </button>
          <button
            type="button"
            className={`${TOGGLE_BUTTON} ${theme === 'dark' ? 'bg-[var(--dash-muted-bg)] text-[var(--dash-text-strong)]' : 'bg-transparent text-[var(--dash-text-muted)]'}`}
            onClick={() => theme !== 'dark' && onToggleTheme()}
          >
            <Moon size={15} /> Escuro
          </button>
        </div>
      </div>

      <div className="mt-5">
        <small className="block text-[var(--dash-text-faint)] text-[length:var(--fs-2xs)] tracking-[0.3px] mb-[10px]">COR DE DESTAQUE</small>
        <div className="flex flex-wrap gap-[14px]">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className="group flex flex-col items-center gap-[7px] w-[68px] border-0 bg-transparent p-0"
              onClick={() => onAccentChange(option.key)}
              aria-pressed={accentColor === option.key}
              title={option.label}
            >
              <span
                className="grid place-items-center w-10 h-10 rounded-full text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-150 group-hover:scale-[1.08] group-aria-pressed:shadow-[0_0_0_2px_var(--dash-surface),0_0_0_4px_var(--brand-accent)]"
                style={{ background: option.swatch }}
              >
                {accentColor === option.key && <Check size={16} />}
              </span>
              <span className="text-[length:var(--fs-2xs)] text-[var(--dash-text-muted)] text-center">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
