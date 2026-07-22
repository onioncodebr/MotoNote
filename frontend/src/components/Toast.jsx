import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { IconButton } from './IconButton'

const ToastContext = createContext(null)
let idCounter = 0

// Feedback leve de sucesso/erro pós-ação (criar, editar, excluir), já que
// hoje essas ações só atualizam a lista silenciosamente. Não substitui os
// erros inline dos formulários — é só a confirmação depois que o modal fecha.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
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
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{t.message}</span>
            <IconButton icon={X} size={14} onClick={() => dismiss(t.id)} aria-label="Fechar notificação" />
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
