import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const SCRIPT_ID = 'cf-turnstile-script'

// Carrega o script da Cloudflare uma única vez (compartilhado entre todos
// os widgets da página, mesmo com Login/Cadastro/RecuperarSenha montando
// cada um o seu) — evita duplicar a tag/o carregamento a cada formulário.
let scriptPromise = null
function carregarScript() {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existente = document.getElementById(SCRIPT_ID)
    if (existente) {
      existente.addEventListener('load', resolve)
      existente.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Widget de verificação anti-automação (Cloudflare Turnstile). Sem
// VITE_TURNSTILE_SITE_KEY configurada, não renderiza nada — mesmo
// princípio "liga sozinho quando configurado" do TurnstileGateway no
// backend (que também não bloqueia nada enquanto a chave não existe).
// onVerify recebe o token pra mandar junto no submit do formulário; o pai
// chama reset() (via ref) depois de um submit que falhou, porque um token
// já usado (ou expirado) não serve de novo.
export const Turnstile = forwardRef(function Turnstile({ onVerify }, ref) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [erro, setErro] = useState(false)

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    if (!SITE_KEY) return undefined
    let cancelado = false

    carregarScript()
      .then(() => {
        if (cancelado || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify(token),
          'expired-callback': () => onVerify(''),
          'error-callback': () => setErro(true),
        })
      })
      .catch(() => setErro(true))

    return () => {
      cancelado = true
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!SITE_KEY) return null

  return (
    <div>
      <div ref={containerRef} />
      {erro && <p className="auth-error" role="alert">Não foi possível carregar a verificação de segurança. Recarregue a página.</p>}
    </div>
  )
})
