import { useEffect, useState } from 'react'
import { STATUS_LOGISTICO_LABELS } from '../utils/statusLogistico'
import { FormModal } from './FormModal'

// Modal de troca de status logístico (individual OU em massa) — pede
// observação obrigatória só quando o novo status é "Não foi possível
// entregar" (ver fluxo-entrega-configuracoes.md). Extraído pra arquivo
// próprio porque é reaproveitado tanto em EntregasPendentesView.jsx (abas
// de status) quanto em EntregasView.jsx (aba "Todas as Entregas").
export function AlterarStatusModal({ isOpen, quantidade = 1, onRequestClose, onConfirmar }) {
  const [status, setStatus] = useState('')
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStatus('')
      setObservacao('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!status) {
      setError('Selecione um status.')
      return
    }
    if (status === 'NAO_ENTREGUE' && !observacao.trim()) {
      setError('Informe o motivo pelo qual não foi possível entregar.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onConfirmar(status, observacao.trim() || undefined)
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title={quantidade > 1 ? `Alterar status de ${quantidade} entregas` : 'Alterar status da entrega'}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar status"
      submitLabelLoading="Salvando..."
      width={420}
    >
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} required>
          <option value="" disabled>Selecione o status</option>
          {Object.entries(STATUS_LOGISTICO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      {status === 'NAO_ENTREGUE' && (
        <label>
          Motivo
          <textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Cliente não atendeu, endereço não encontrado..." />
        </label>
      )}
    </FormModal>
  )
}
