import { useMemo } from 'react'
import Modal from 'react-modal'
import { X } from 'lucide-react'
import { getModalStyles, MODAL_CLOSE_TIMEOUT_MS, modalParentSelector } from './modalStyles'
import { Button } from './Button'
import { IconButton } from './IconButton'

// Modal de formulário genérico: header com título + fechar, form com os
// campos passados via children, erro inline e ações (Cancelar/Submit).
// Consolida o padrão que era duplicado entre os modais de Add/Edit de
// Motoboys e Usuários.
export function FormModal({
  isOpen,
  onRequestClose,
  title,
  onSubmit,
  loading = false,
  error = '',
  submitLabel = 'Salvar',
  submitLabelLoading = 'Salvando...',
  cancelLabel = 'Cancelar',
  width = 400,
  contentLabel,
  children,
}) {
  const modalStyles = useMemo(() => getModalStyles(width), [width])

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={modalStyles}
      contentLabel={contentLabel || title}
      closeTimeoutMS={MODAL_CLOSE_TIMEOUT_MS}
      parentSelector={modalParentSelector}
    >
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-bold text-[length:var(--fs-lg)] m-0 text-[var(--dash-text-strong)] min-w-0 break-words">{title}</h2>
        <IconButton icon={X} onClick={onRequestClose} disabled={loading} aria-label="Fechar" />
      </div>
      <form onSubmit={onSubmit} className="modal-form">
        {children}
        {error && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{error}</p>}
        <div className="flex flex-wrap justify-end gap-[var(--space-3)] mt-[var(--space-4)]">
          <Button type="button" variant="outline" size="small" onClick={onRequestClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="dark" size="small" disabled={loading}>
            {loading ? submitLabelLoading : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
