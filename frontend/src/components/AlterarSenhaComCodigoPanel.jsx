import { useState } from 'react'
import { requestPasswordChangeCode, confirmPasswordChange } from '../services/api'
import { FormModal } from './FormModal'
import { Button } from './Button'
import { useToast } from './Toast'

// Troca de senha em duas etapas — o código vai pro e-mail já cadastrado na
// conta, mesmo espírito de AlterarTelefonePanel (ao lado do qual este
// bloco é plugado, dentro do card "Perfil" da ConfiguracoesView). Só pro
// dono da conta: o motoboy continua com a troca direta (ver
// AlterarSenhaPanel, usado por MotoboyContaView).
export function AlterarSenhaComCodigoPanel() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('senha')
  const [actualPassword, setActualPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const abrir = () => {
    setStep('senha')
    setActualPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setCodigo('')
    setError('')
    setOpen(true)
  }

  const solicitarCodigo = async (e) => {
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
      await requestPasswordChangeCode(actualPassword, newPassword)
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
      await confirmPasswordChange(codigo)
      setOpen(false)
      toast.success('Senha alterada com sucesso.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível confirmar o código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="perfil-subcampo">
      <span className="perfil-subcampo-label">Senha</span>
      <span className="perfil-subcampo-valor">••••••••</span>
      <Button type="button" variant="outline" size="small" onClick={abrir}>Alterar senha</Button>

      <FormModal
        isOpen={open}
        onRequestClose={() => !loading && setOpen(false)}
        title="Alterar senha"
        onSubmit={step === 'senha' ? solicitarCodigo : confirmar}
        loading={loading}
        error={error}
        submitLabel={step === 'senha' ? 'Enviar código' : 'Confirmar'}
        submitLabelLoading={step === 'senha' ? 'Enviando código...' : 'Confirmando...'}
        width={400}
      >
        {step === 'senha' ? (
          <>
            <label>
              Senha atual
              <input type="password" value={actualPassword} onChange={(e) => setActualPassword(e.target.value)} placeholder="Digite sua senha atual" autoFocus required />
            </label>
            <label>
              Nova senha
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required />
            </label>
            <label>
              Confirmar nova senha
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" minLength={8} required />
            </label>
          </>
        ) : (
          <>
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
                autoFocus
                required
              />
            </label>
          </>
        )}
      </FormModal>
    </div>
  )
}
