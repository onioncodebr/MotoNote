// O ícone da cebola substitui o "M" de "MotoNote" (fica embutido no texto,
// não ao lado dele) — só no modo compacto (ícone sozinho, sem texto) é que
// ele aparece como imagem simples.
export function Logo({ compact = false, dark = false, subtitle = false }) {
  const src = dark ? '/icon.png' : '/icon-black.png'

  if (compact) {
    return (
      <div className="brand brand-compact">
        <img src={src} alt="MotoNote" />
      </div>
    )
  }

  return (
    <div className="brand">
      <span className={subtitle ? 'brand-text has-subtitle' : 'brand-text'}>
        <span className="brand-word"><img className="brand-m" src={src} alt="M" />oto<b>Note</b></span>
        {subtitle && <small className="brand-subtitle">Motoboy Annotation</small>}
      </span>
    </div>
  )
}
