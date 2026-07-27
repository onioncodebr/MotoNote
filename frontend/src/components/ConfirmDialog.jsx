import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X } from 'lucide-react'
import { getModalStyles, MODAL_CLOSE_TIMEOUT_MS, modalParentSelector } from './modalStyles'
import { Button } from './Button'
import { IconButton } from './IconButton'

const modalStyles = getModalStyles(380)

// Modal de confirmação genérico para ações destrutivas (excluir motoboy,
// entrega, usuário, etc). Substitui o window.confirm() nativo do navegador
// por uma caixa centralizada e com a identidade visual do app.
//
// Com requirePassword, pede a senha do usuário logado antes de liberar o
// botão de confirmar — usado onde a exclusão é sensível (ex.: motoboy) e
// onConfirm passa a receber a senha digitada como argumento.
export function ConfirmDialog({
  isOpen,
  title = 'Confirmar exclusão',
  message = 'Tem certeza que deseja excluir? Você não pode voltar atrás depois que clicar em confirmar.',
  confirmLabel = 'Confirmar exclusão',
  cancelLabel = 'Cancelar',
  isLoading = false,
  error = '',
  requirePassword = false,
  onCancel,
  onConfirm,
}) {
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!isOpen) setPassword('')
  }, [isOpen])

  const header = (
    <div className="flex justify-between items-center mb-5">
      <h2 className="font-bold text-[length:var(--fs-lg)] m-0 text-[var(--dash-text-strong)] min-w-0 break-words">{title}</h2>
      <IconButton icon={X} onClick={onCancel} disabled={isLoading} aria-label="Fechar" />
    </div>
  )

  if (requirePassword) {
    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onCancel}
        style={modalStyles}
        contentLabel={title}
        shouldCloseOnOverlayClick={!isLoading}
        closeTimeoutMS={MODAL_CLOSE_TIMEOUT_MS}
        parentSelector={modalParentSelector}
      >
        {header}
        <form
          className="modal-form grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onConfirm(password)
          }}
        >
          <p className="confirm-dialog-message">{message}</p>
          <label>
            Confirme sua senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha para confirmar"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{error}</p>}
          <div className="flex flex-wrap justify-end gap-[var(--space-3)] mt-[var(--space-4)]">
            <Button type="button" variant="outline" size="small" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="danger" size="small" disabled={isLoading || !password}>
              {isLoading ? 'Excluindo...' : confirmLabel}
            </Button>
          </div>
        </form>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onCancel}
      style={modalStyles}
      contentLabel={title}
      shouldCloseOnOverlayClick={!isLoading}
      closeTimeoutMS={MODAL_CLOSE_TIMEOUT_MS}
      parentSelector={modalParentSelector}
    >
      {header}
      <p className="confirm-dialog-message">{message}</p>
      {error && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{error}</p>}
      <div className="flex flex-wrap justify-end gap-[var(--space-3)] mt-[var(--space-4)]">
        <Button type="button" variant="outline" size="small" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant="danger" size="small" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Excluindo...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
