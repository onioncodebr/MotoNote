import { useState } from 'react'
import { requestPhoneChange, confirmPhoneChange } from '../services/api'

// Troca de telefone em duas etapas (código de 6 dígitos mandado pro e-mail
// já cadastrado na conta, não pro telefone novo) — mesmo espírito de
// AlterarSenhaPanel: painel autocontido, plugado pela ConfiguracoesView.
export function AlterarTelefonePanel({ telefoneAtual, onConfirmed }) {
  const [editando, setEditando] = useState(false)
  const [step, setStep] = useState('telefone')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const cancelar = () => {
    setEditando(false)
    setStep('telefone')
    setNovoTelefone('')
    setCodigo('')
    setError('')
  }

  const solicitarCodigo = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPhoneChange(novoTelefone)
      setStep('codigo')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível enviar o código.')
    } finally {
      setLoading(false)
    }
  }

  const confirmar = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const atualizado = await confirmPhoneChange(codigo)
      onConfirmed?.(atualizado.phone)
      setSuccess('Telefone atualizado com sucesso.')
      cancelar()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível confirmar o código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Telefone</h2></div>
      <div className="delivery-form">
        {!editando ? (
          <>
            <label>
              Telefone atual
              <input type="text" value={telefoneAtual || 'Não informado'} disabled />
            </label>
            {success && <p className="form-success">{success}</p>}
            <button type="button" className="button button-outline small-button" onClick={() => { setSuccess(''); setEditando(true) }}>
              Alterar telefone
            </button>
          </>
        ) : step === 'telefone' ? (
          <form onSubmit={solicitarCodigo}>
            <label>
              Novo telefone
              <input type="tel" placeholder="(11) 91234-5678" value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} required />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="button button-dark small-button" disabled={loading}>
                {loading ? 'Enviando código...' : 'Enviar código'}
              </button>
              <button type="button" className="button button-outline small-button" onClick={cancelar}>Cancelar</button>
            </div>
          </form>
        ) : (
          <form onSubmit={confirmar}>
            <p>Enviamos um código de 6 dígitos para o e-mail da sua conta.</p>
            <label>
              Código
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="button button-dark small-button" disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button type="button" className="button button-outline small-button" onClick={cancelar}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
