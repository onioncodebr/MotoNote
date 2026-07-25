import { useState } from 'react'
import { requestPhoneChange, confirmPhoneChange } from '../services/api'
import { FormModal } from './FormModal'
import { useToast } from './Toast'

// Troca de telefone em duas etapas (código de 6 dígitos mandado pro e-mail
// já cadastrado na conta, não pro telefone novo). Sem card próprio — é um
// bloco compacto plugado dentro do card "Perfil" (ConfiguracoesView), ao
// lado de Senha (ver AlterarSenhaComCodigoPanel); o formulário em si vira
// um popup (FormModal).
export function AlterarTelefonePanel({ telefoneAtual, onConfirmed }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('telefone')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const abrir = () => {
    setStep('telefone')
    setNovoTelefone('')
    setCodigo('')
    setError('')
    setOpen(true)
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
      setOpen(false)
      toast.success('Telefone atualizado com sucesso.')
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível confirmar o código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="perfil-subcampo">
      <span className="perfil-subcampo-label">Telefone</span>
      <span className="perfil-subcampo-valor">{telefoneAtual || 'Nenhum telefone cadastrado.'}</span>
      <button type="button" className="button button-outline small-button" onClick={abrir}>Alterar telefone</button>

      <FormModal
        isOpen={open}
        onRequestClose={() => !loading && setOpen(false)}
        title="Alterar telefone"
        onSubmit={step === 'telefone' ? solicitarCodigo : confirmar}
        loading={loading}
        error={error}
        submitLabel={step === 'telefone' ? 'Enviar código' : 'Confirmar'}
        submitLabelLoading={step === 'telefone' ? 'Enviando código...' : 'Confirmando...'}
        width={400}
      >
        {step === 'telefone' ? (
          <label>
            Novo telefone
            <input type="tel" placeholder="(11) 91234-5678" value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} autoFocus required />
          </label>
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
