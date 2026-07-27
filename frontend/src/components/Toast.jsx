import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { IconButton } from './IconButton'

const ToastContext = createContext(null)
let idCounter = 0
// Bate com a duração de @keyframes toast-out em index.css.
const TOAST_EXIT_MS = 200

// Feedback leve de sucesso/erro pós-ação (criar, editar, excluir), já que
// hoje essas ações só atualizam a lista silenciosamente. Não substitui os
// erros inline dos formulários — é só a confirmação depois que o modal fecha.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    // Marca como "exiting" em vez de remover do array na hora — dá tempo da
    // animação de saída (toast-out) tocar antes do toast sumir de vez do
    // DOM. Ignora se já estiver saindo (dismiss manual clicado durante o
    // auto-dismiss, por exemplo), pra não empilhar timeouts à toa.
    let jaSaindo = false
    setToasts((prev) => prev.map((t) => {
      if (t.id !== id) return t
      jaSaindo = t.exiting
      return { ...t, exiting: true }
    }))
    if (jaSaindo) return
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_EXIT_MS)
  }, [])

  const push = useCallback((message, type) => {
    const id = ++idCounter
    setToasts((prev) => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  const value = useMemo(() => ({
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-[var(--space-5)] bottom-[var(--space-5)] z-[70] flex flex-col gap-[var(--space-2)] max-w-[min(360px,calc(100vw_-_var(--space-5)*2))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            // A classe "toast" não tem estilo próprio (visual é 100% via
            // utilitários Tailwind acima) — existe só como gancho pro
            // seletor descendente ".toast .icon-button" em App.css
            // (@media pointer: coarse), que aumenta o botão de fechar em
            // telas de toque.
            className={`toast flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--dash-surface)] border border-[var(--dash-border)] shadow-[var(--shadow-md)] text-[length:var(--fs-sm)] ${t.exiting ? 'motion-safe:animate-[toast-out_.2s_var(--ease-out)_both] pointer-events-none' : 'motion-safe:animate-[toast-in_.25s_var(--ease-out)_both]'}`}
          >
            <span className={t.type === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
              {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <span className="flex-1 text-[var(--dash-text-strong)]">{t.message}</span>
            <IconButton
              icon={X}
              size={14}
              boxSize="sm"
              className="ml-auto flex-shrink-0"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar notificação"
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa ser usado dentro de um ToastProvider')
  return ctx
}
