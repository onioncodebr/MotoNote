import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { requestSignupCode, confirmSignup, createCheckoutSession, getPlano, registrarVisitaPagina } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { Button } from './Button'
import { Logo } from './Logo'
import { Turnstile } from './Turnstile'

// Cadastro público autoatendido, em duas etapas: 1) pede os dados e manda um
// código de 6 dígitos pro e-mail informado (sem criar nada em definitivo);
// 2) confirma o código, só aí a conta é criada (role USER, auto-login) e
// segue direto pro Checkout do Stripe (15 dias de trial, cartão pedido já
// aqui). Reaproveita a mesma estrutura visual de Login (.auth-page/.auth-form)
// pra manter consistência, só troca a copy e os campos.
export function Cadastro({ onBack, onGoToLogin, onSuccess }) {
  const [step, setStep] = useState('form')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Criando conta...')
  const [plano, setPlano] = useState(null)

  const [codigo, setCodigo] = useState('')
  const [reenviando, setReenviando] = useState(false)
  const [notice, setNotice] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    getPlano().then((data) => { if (!cancelado) setPlano(data) }).catch(() => {})
    registrarVisitaPagina('CADASTRO')
    return () => { cancelado = true }
  }, [])

  const trialDays = plano?.trialDays ?? 15
  // null enquanto plano ainda não carregou — só considera desabilitado
  // depois de saber de verdade (evita piscar a mensagem de erro no primeiro render).
  const cadastroDesabilitado = plano != null && plano.cadastroPublicoHabilitado === false

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (!aceiteTermos) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.')
      return
    }

    setLoading(true)
    try {
      await requestSignupCode(name, email, password, confirmPassword, phone, captchaToken)
      setStep('codigo')
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
      await requestSignupCode(name, email, password, confirmPassword, phone, captchaToken)
      setNotice('Reenviamos o código para o seu e-mail.')
    } catch (requestError) {
      setError(requestError.message)
      turnstileRef.current?.reset()
      setCaptchaToken('')
    } finally {
      setReenviando(false)
    }
  }

  const submitCodigo = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    setLoadingLabel('Confirmando código...')

    let user
    try {
      user = await confirmSignup(email, codigo)
    } catch (requestError) {
      setError(requestError.message)
      setLoading(false)
      return
    }

    try {
      setLoadingLabel('Preparando seu período de teste...')
      const { checkoutUrl } = await createCheckoutSession()
      window.location.href = checkoutUrl
      // Sem setLoading(false) aqui de propósito: a página está de saída (redirect).
    } catch {
      // Conta já criada e usuário já logado — não trava numa tela sem saída.
      // Ele cai no dashboard e pode tentar assinar de novo pela tela de Assinatura.
      onSuccess(user)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-image">
        <button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar para o início</button>
        <div className="auth-quote">
          <span>“</span>
          <p>{trialDays} dias grátis pra organizar<br /><em>sua operação de entregas.</em></p>
          <small>MotoNote</small>
        </div>
        <div className="auth-image-footer">
          <Logo />
          <span>Cartão pedido agora, cobrança só depois do teste.</span>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-mobile-logo"><Logo /></div>

          {cadastroDesabilitado ? (
            <>
              <div className="eyebrow">Cadastro indisponível</div>
              <h1>Novos cadastros pausados</h1>
              <p className="auth-subtitle">
                No momento não estamos aceitando novos cadastros. Tente novamente mais tarde.
              </p>
              <p className="auth-help">Já tem uma conta? <a href="#entrar" onClick={(e) => { e.preventDefault(); onGoToLogin() }}>Entrar</a></p>
            </>
          ) : step === 'form' ? (
            <>
              <div className="eyebrow">Comece agora</div>
              <h1>Crie sua conta</h1>
              <p className="auth-subtitle">
                {trialDays} dias grátis{plano ? <> — depois, {formatarMoeda(plano.valorMensal)}/mês</> : null}. Cancele quando quiser, sem cobrança durante o teste.
              </p>
              <form onSubmit={submit}>
                <label>
                  Nome
                  <input type="text" placeholder="Seu nome ou o da empresa" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label>
                  E-mail
                  <input type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                  Telefone (opcional)
                  <input type="tel" placeholder="(11) 91234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label>
                  Senha
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={-1}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
                <label>
                  Confirmar senha
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="terms-check">
                  <input
                    type="checkbox"
                    checked={aceiteTermos}
                    onChange={(e) => setAceiteTermos(e.target.checked)}
                    required
                  />
                  <span>
                    Li e aceito os{' '}
                    <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a>{' '}
                    e a{' '}
                    <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.
                  </span>
                </label>
                <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button variant="dark" full disabled={loading}>
                  {loading ? 'Enviando código...' : <>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></>}
                </Button>
                <p className="trial-reassurance"><ShieldCheck size={15} /> Você não paga nada agora. Se cancelar antes de {trialDays} dias, não é cobrado nenhum valor.</p>
              </form>
              <p className="auth-help">Já tem uma conta? <a href="#entrar" onClick={(e) => { e.preventDefault(); onGoToLogin() }}>Entrar</a></p>
            </>
          ) : (
            <>
              <div className="eyebrow">Falta pouco</div>
              <h1>Confirme seu e-mail</h1>
              <p className="auth-subtitle">Enviamos um código de 6 dígitos para <strong>{email}</strong>. Digite abaixo para concluir o cadastro.</p>
              <form onSubmit={submitCodigo}>
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
                {notice && <p className="auth-notice" role="status">{notice}</p>}
                {error && <p className="auth-error" role="alert">{error}</p>}
                <Button variant="dark" full disabled={loading}>
                  {loading ? loadingLabel : <>Confirmar e criar conta <span><ArrowRight size={17} /></span></>}
                </Button>
              </form>
              {/* Widget separado do form acima: "reenviar" chama de novo o
                  endpoint de iniciar cadastro, que também exige um token —
                  e o token do passo anterior já foi consumido. */}
              <Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />
              <p className="auth-help">
                Não recebeu? <a href="#reenviar" onClick={(e) => { e.preventDefault(); if (!reenviando) reenviarCodigo() }}>{reenviando ? 'Reenviando...' : 'Reenviar código'}</a>
              </p>
              <p className="auth-help">
                <a href="#voltar" onClick={(e) => { e.preventDefault(); setStep('form'); setError(''); setNotice('') }}>Corrigir dados do cadastro</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
