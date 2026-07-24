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

// Compartilhado entre ConfiguracoesView (dono da conta) e MotoboyContaView
// (portal do motoboy) — tema e cor de destaque valem pra qualquer papel
// logado, não é uma preferência exclusiva do dono.
export function AparenciaPanel({ theme, onToggleTheme, accentColor, onAccentChange }) {
  return (
    <div className="panel configuracoes-grid-full">
      <div className="panel-header"><h2>Aparência</h2></div>

      <div className="appearance-section">
        <small>MODO</small>
        <div className="theme-mode-toggle">
          <button type="button" className={theme === 'light' ? 'selected' : ''} onClick={() => theme !== 'light' && onToggleTheme()}>
            <Sun size={15} /> Claro
          </button>
          <button type="button" className={theme === 'dark' ? 'selected' : ''} onClick={() => theme !== 'dark' && onToggleTheme()}>
            <Moon size={15} /> Escuro
          </button>
        </div>
      </div>

      <div className="appearance-section">
        <small>COR DE DESTAQUE</small>
        <div className="accent-swatches">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className="accent-swatch"
              onClick={() => onAccentChange(option.key)}
              aria-pressed={accentColor === option.key}
              title={option.label}
            >
              <span className="accent-swatch-circle" style={{ background: option.swatch }}>
                {accentColor === option.key && <Check size={16} />}
              </span>
              <span className="accent-swatch-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
