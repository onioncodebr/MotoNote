import { useState } from 'react'

// Reaproveitado pelo dono da conta (ConfiguracoesView) e pelo motoboy
// (MotoboyContaView) — só muda a função de API chamada em onSubmit.
export function AlterarSenhaPanel({ onSubmit }) {
  const [actualPassword, setActualPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.')
      return
    }

    setLoading(true)
    try {
      await onSubmit(actualPassword, newPassword)
      setSuccess('Senha alterada com sucesso.')
      setActualPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível alterar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Alterar senha</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label>
          Senha atual
          <input
            type="password"
            value={actualPassword}
            onChange={(e) => setActualPassword(e.target.value)}
            placeholder="Digite sua senha atual"
            required
          />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirmar nova senha
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            minLength={8}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <button type="submit" className="button button-dark small-button" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
