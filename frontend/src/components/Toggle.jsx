// Switch on/off reutilizável — usado nas configurações opcionais de
// Entregas (ver ConfiguracoesView.jsx), em vez de checkbox cru, pra deixar
// visualmente claro que é um liga/desliga.
export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`toggle-row ${disabled ? 'toggle-row-disabled' : ''}`}>
      <span className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        {description && <span className="toggle-row-desc">{description}</span>}
      </span>
      <span className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track"><span className="toggle-thumb" /></span>
      </span>
    </label>
  )
}
