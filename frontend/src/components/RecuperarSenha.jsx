import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { requestPasswordReset, resetPassword } from '../services/api'
import { Button } from './Button'
import { Logo } from './Logo'
import { Turnstile } from './Turnstile'

// Recuperação de senha em duas etapas, código de 6 dígitos por e-mail —
// mesmo padrão de Cadastro.jsx. Não loga automaticamente ao final (ver
// RecuperacaoSenhaService.redefinirSenha no backend): sucesso manda de volta
// pro login, com a senha nova.
export function RecuperarSenha({ onBack, onGoToLogin }) {
  const [step, setStep] = useState('email')

  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  const solicitarCodigo = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email, captchaToken)
      setStep('redefinir')
    } catch (requestError) {
      setError(requestError.message)
      turnstileRef.current?.reset()
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  const reenviarCodigo = async () => {
    setError('')
    setNotice('')
    setReenviando(true)
    try {
      await requestPasswordReset(email, captchaToken)
      setNotice('Reenviamos o código para o seu e-mail.')
    } catch (requestError) {
      setError(requestError.message)
      turnstileRef.current?.reset()
      setCaptchaToken('')
    } finally {
      setReenviando(false)
    }
  }

  const redefinir = async (event) => {
    event.preventDefault()
    setError('')

    if (novaSenha.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (novaSenha !== confirmarNovaSenha) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(email, codigo, novaSenha, confirmarNovaSenha)
      setConcluido(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-image">
        <button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar para o início</button>
        <div className="auth-quote">
          <span>“</span>
          <p>Acesso recuperado em<br /><em>poucos minutos.</em></p>
          <small>MotoNote</small>
        </div>
        <div className="auth-image-footer">
          <Logo />
          <span>Gestão inteligente para quem entrega.</span>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-mobile-logo"><Logo /></div>

          {concluido ? (
            <>
              <div className="eyebrow">Tudo certo</div>
              <h1>Senha redefinida</h1>
              <p className="auth-subtitle">Sua senha foi alterada com sucesso. Faça login com a senha nova.</p>
              <Button variant="dark" full onClick={onGoToLogin}>
                Ir para o login <span><ArrowRight size={17} /></span>
              </Button>
            </>
          ) : step === 'email' ? (
            <>
              <div className="eyebrow">Recuperar acesso</div>
              <h1>Esqueci minha senha</h1>
              <p className="auth-subtitle">Informe o e-mail da sua conta. Se ele existir, enviamos um código de 6 dígitos.</p>
              <form onSubmit={solicitarCodigo}>
                <label>
                  E-mail
                  <input type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button variant="dark" full disabled={loading}>
                  {loading ? 'Enviando código...' : <>Enviar código <span><ArrowRight size={17} /></span></>}
                </Button>
              </form>
              <p className="auth-help">Lembrou a senha? <a href="#entrar" onClick={(e) => { e.preventDefault(); onGoToLogin() }}>Voltar para o login</a></p>
            </>
          ) : (
            <>
              <div className="eyebrow">Falta pouco</div>
              <h1>Defina sua nova senha</h1>
              <p className="auth-subtitle">Enviamos um código de 6 dígitos para <strong>{email}</strong>.</p>
              <form onSubmit={redefinir}>
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
                <label>
                  Nova senha
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={-1}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
                <label>
                  Confirmar nova senha
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    minLength={8}
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    required
                  />
                </label>
                {notice && <p className="auth-notice" role="status">{notice}</p>}
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button variant="dark" full disabled={loading}>
                  {loading ? 'Redefinindo...' : <>Redefinir senha <span><ArrowRight size={17} /></span></>}
                </Button>
              </form>
              {/* Widget separado do form acima: "reenviar" chama o mesmo
                  endpoint de forgot-password, que também exige um token —
                  e o token do passo anterior já foi consumido. */}
              <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />
              <p className="auth-help">
                Não recebeu? <a href="#reenviar" onClick={(e) => { e.preventDefault(); if (!reenviando) reenviarCodigo() }}>{reenviando ? 'Reenviando...' : 'Reenviar código'}</a>
              </p>
              <p className="auth-help">
                <a href="#voltar" onClick={(e) => { e.preventDefault(); setStep('email'); setError(''); setNotice('') }}>Corrigir e-mail</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
