import { useEffect, useRef, useState } from 'react'

// Anima uma seção pra dentro (fade + leve translateY) quando ela entra na
// viewport. Se o navegador não suportar IntersectionObserver, ou algo dar
// errado ao configurá-lo, o conteúdo cai de volta a visível imediatamente —
// nunca fica escondido dependendo só do JS funcionar perfeitamente.
export function Reveal({ children, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    try {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        },
        { threshold: 0.15 }
      )
      observer.observe(node)
      return () => observer.disconnect()
    } catch {
      setVisible(true)
      return undefined
    }
  }, [])

  return (
    <Tag ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}
