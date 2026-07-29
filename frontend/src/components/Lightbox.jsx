import { useEffect } from 'react'
import { X } from 'lucide-react'

// Ampliação de screenshot em tela cheia — usado pelas landing pages
// alternativas (/lp1, /lp2, /lp3) em toda imagem de produto clicável.
export function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [src, onClose])

  if (!src) return null

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Fechar imagem ampliada"><X size={20} /></button>
      <img src={src} alt={alt} className="lightbox-image" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
