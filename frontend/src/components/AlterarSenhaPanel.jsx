import { useState } from 'react'
import { FormModal } from './FormModal'
import { Button } from './Button'
import { useToast } from './Toast'

// Reaproveitado pelo dono da conta (ConfiguracoesView) e pelo motoboy
// (MotoboyContaView) — só muda a função de API chamada em onSubmit. O
// card fica só com um botão; o formulário em si vira um popup (FormModal),
// junto com Telefone (ver AlterarTelefonePanel).
export function AlterarSenhaPanel({ onSubmit }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [actualPassword, setActualPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const abrir = () => {
    setActualPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

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
      setOpen(false)
      toast.success('Senha alterada com sucesso.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível alterar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Senha</h2></div>
      <p className="panel-trigger-text">Defina uma nova senha de acesso à sua conta.</p>
      <Button type="button" variant="outline" size="small" onClick={abrir}>Alterar senha</Button>

      <FormModal
        isOpen={open}
        onRequestClose={() => !loading && setOpen(false)}
        title="Alterar senha"
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitLabel="Salvar nova senha"
        submitLabelLoading="Salvando..."
        width={400}
      >
        <label>
          Senha atual
          <input
            type="password"
            value={actualPassword}
            onChange={(e) => setActualPassword(e.target.value)}
            placeholder="Digite sua senha atual"
            autoFocus
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
      </FormModal>
    </div>
  )
}
