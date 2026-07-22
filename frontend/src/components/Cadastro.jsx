import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { signup, createCheckoutSession, getPlano } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { Logo } from './Logo'

// Cadastro público autoatendido: cria a conta (role USER, auto-login) e leva
// direto pro Checkout do Stripe (15 dias de trial, cartão pedido já aqui).
// Reaproveita a mesma estrutura visual de Login (.auth-page/.auth-form) pra
// manter consistência, só troca a copy e os campos.
export function Cadastro({ onBack, onGoToLogin, onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Criando conta...')
  const [plano, setPlano] = useState(null)

  useEffect(() => {
    let cancelado = false
    getPlano().then((data) => { if (!cancelado) setPlano(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])

  const trialDays = plano?.trialDays ?? 15

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

    setLoading(true)
    setLoadingLabel('Criando conta...')

    let user
    try {
      user = await signup(name, email, password, confirmPassword, phone)
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
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-dark full-button" disabled={loading}>
              {loading ? loadingLabel : <>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></>}
            </button>
            <p className="trial-reassurance"><ShieldCheck size={15} /> Você não paga nada agora. Se cancelar antes de {trialDays} dias, não é cobrado nenhum valor.</p>
          </form>
          <p className="auth-help">Já tem uma conta? <a href="#entrar" onClick={(e) => { e.preventDefault(); onGoToLogin() }}>Entrar</a></p>
        </div>
      </div>
    </div>
  )
}
