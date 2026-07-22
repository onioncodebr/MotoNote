import { useMemo } from 'react'
import Modal from 'react-modal'
import { X } from 'lucide-react'
import { getModalStyles } from './modalStyles'
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
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={modalStyles} contentLabel={contentLabel || title}>
      <div className="modal-header">
        <h2>{title}</h2>
        <IconButton icon={X} onClick={onRequestClose} disabled={loading} aria-label="Fechar" />
      </div>
      <form onSubmit={onSubmit} className="modal-form">
        {children}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="button button-outline small-button" onClick={onRequestClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="submit" className="button button-dark small-button" disabled={loading}>
            {loading ? submitLabelLoading : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
