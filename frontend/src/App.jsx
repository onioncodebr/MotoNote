import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Redirect, Route, Switch, useLocation } from 'wouter'
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Sun, Moon,
  X, Menu, LifeBuoy, LogOut, LayoutDashboard, Package, Bike,
  BarChart3, Settings,
  ChevronLeft, ChevronRight, KeyRound, Banknote, Fuel, HandCoins,
  Users, Wallet, History, SlidersHorizontal, Contact,
} from 'lucide-react'
import { clearSession, getCurrentUser, login as authenticate, setOn402Handler, setOn401Handler, setOn423Handler, getConfiguracaoExibicao } from './services/api'
import { montarWhatsappUrl } from './utils/whatsapp'
import './App.css'
import { ToastProvider, useToast } from './components/Toast'
import { Logo } from './components/Logo'
import { Button } from './components/Button'
import { ConfirmDialog } from './components/ConfirmDialog'
import { NovidadePopup } from './components/NovidadePopup'
import { Turnstile } from './components/Turnstile'

// Cada view só é baixada quando o usuário realmente navega até ela — antes
// disso tudo entrava num único bundle inicial, então o login (por exemplo)
// esperava o JS de Usuários, Relatórios etc. mesmo sem precisar de nenhum
// deles ainda.
const Cadastro = lazy(() => import('./components/Cadastro').then((m) => ({ default: m.Cadastro })))
const RecuperarSenha = lazy(() => import('./components/RecuperarSenha').then((m) => ({ default: m.RecuperarSenha })))
const ComoUsar = lazy(() => import('./components/ComoUsar').then((m) => ({ default: m.ComoUsar })))
const LandingLP1 = lazy(() => import('./components/LandingLP1').then((m) => ({ default: m.LandingLP1 })))
const LandingLP2 = lazy(() => import('./components/LandingLP2').then((m) => ({ default: m.LandingLP2 })))
const LandingLP3 = lazy(() => import('./components/LandingLP3').then((m) => ({ default: m.LandingLP3 })))
const Termos = lazy(() => import('./components/Termos').then((m) => ({ default: m.Termos })))
const Privacidade = lazy(() => import('./components/Privacidade').then((m) => ({ default: m.Privacidade })))
const MotoboysView = lazy(() => import('./components/MotoboysView').then((m) => ({ default: m.MotoboysView })))
const EntregasView = lazy(() => import('./components/EntregasView').then((m) => ({ default: m.EntregasView })))
const RelatoriosView = lazy(() => import('./components/RelatoriosView').then((m) => ({ default: m.RelatoriosView })))
const VisaoGeralView = lazy(() => import('./components/VisaoGeralView').then((m) => ({ default: m.VisaoGeralView })))
const ValoresPendentesView = lazy(() => import('./components/ValoresPendentesView').then((m) => ({ default: m.ValoresPendentesView })))
const ClientesView = lazy(() => import('./components/ClientesView').then((m) => ({ default: m.ClientesView })))
const GastosView = lazy(() => import('./components/GastosView').then((m) => ({ default: m.GastosView })))
const ValesView = lazy(() => import('./components/ValesView').then((m) => ({ default: m.ValesView })))
const ConfiguracoesView = lazy(() => import('./components/ConfiguracoesView').then((m) => ({ default: m.ConfiguracoesView })))
const MotoboyContaView = lazy(() => import('./components/MotoboyContaView').then((m) => ({ default: m.MotoboyContaView })))
const UsuariosView = lazy(() => import('./components/UsuariosView').then((m) => ({ default: m.UsuariosView })))
const VisaoGeralMasterView = lazy(() => import('./components/VisaoGeralMasterView').then((m) => ({ default: m.VisaoGeralMasterView })))
const AssinaturasView = lazy(() => import('./components/AssinaturasView').then((m) => ({ default: m.AssinaturasView })))
const MotoboysMasterView = lazy(() => import('./components/MotoboysMasterView').then((m) => ({ default: m.MotoboysMasterView })))
const AuditoriaView = lazy(() => import('./components/AuditoriaView').then((m) => ({ default: m.AuditoriaView })))
const ConfiguracaoGlobalView = lazy(() => import('./components/ConfiguracaoGlobalView').then((m) => ({ default: m.ConfiguracaoGlobalView })))

function ViewLoading() {
  return <div className="flex flex-col items-center gap-[10px] py-[44px] px-5 text-center text-[length:var(--fs-base)] text-[var(--dash-text-faint)]">Carregando...</div>
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
}

// Cores de destaque válidas (mesmas chaves usadas em ConfiguracoesView, que
// tem a lista completa com rótulo e amostra de cor pro seletor).
const ACCENT_COLORS = ['laranja', 'azul', 'vermelho', 'roxo', 'preto-e-branco', 'verde', 'rosa']

function getInitialAccent() {
  if (typeof window === 'undefined') return 'laranja'
  const salvo = localStorage.getItem('accentColor')
  return ACCENT_COLORS.includes(salvo) ? salvo : 'laranja'
}

function Icon({ icon: IconComponent, size = 18 }) {
  return (
    <span className="icon">
      <IconComponent size={size} strokeWidth={2} />
    </span>
  )
}

function Login({ onBack, onSuccess, onSignup, onForgotPassword, notice }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await authenticate(email, password, captchaToken)
      onSuccess(user)
    } catch (requestError) {
      setError(requestError.message)
      turnstileRef.current?.reset()
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-page"><div className="auth-image"><button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar para o início</button><div className="auth-quote"><span>“</span><p>Organize sua operação.<br /><em>Entregue melhores resultados.</em></p><small>MotoNote</small></div><div className="auth-image-footer"><Logo /><span>Gestão inteligente para quem entrega.</span></div></div><div className="auth-form-wrap"><div className="auth-form"><div className="auth-mobile-logo"><Logo /></div><div className="eyebrow">Bem-vindo de volta</div><h1>Acesse sua conta</h1><p className="auth-subtitle">Entre para acompanhar sua operação de entregas.</p><form onSubmit={submit}><label>E-mail<input type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={-1}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><div className="form-options"><a href="#recuperar-senha" onClick={(e) => { e.preventDefault(); onForgotPassword() }}>Esqueci minha senha</a></div><Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />{notice && <p className="auth-notice" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}<Button variant="dark" full disabled={loading}>{loading ? 'Entrando...' : <>Entrar na plataforma <span><ArrowRight size={17} /></span></>}</Button></form><p className="auth-help">Ainda não tem conta? <a href="#criar-conta" onClick={(e) => { e.preventDefault(); onSignup() }}>Iniciar teste grátis</a></p></div></div></div>
}


function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function Dashboard({ user, onLogout, onUserUpdated, theme, onToggleTheme, accentColor, onAccentChange, checkoutParam, paywall, onPaywallHandled, onComoUsar }) {
  const toast = useToast()
  const companyName = user?.name || 'Empresa'
  const initials = companyName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const isMaster = user?.role === 'MASTER'
  // Portal restrito do motoboy: só Visão geral, Entregas (leitura) e Relatórios
  // — sem cadastro/edição de nada, sem ver outros motoboys ou administração.
  const isMotoboy = user?.tipo === 'MOTOBOY'
  const [active, setActive] = useState('Visão geral')
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')
  const [exibicao, setExibicao] = useState(null)

  // Aviso de alterações não salvas nas configurações de Entregas (ver
  // ConfiguracoesView/EntregasConfigPanel) — configDirty é atualizado pelo
  // próprio painel via onConfigDirtyChange; pendingNav guarda o destino
  // que o usuário tentou acessar enquanto havia alteração pendente.
  const [configDirty, setConfigDirty] = useState(false)
  const [pendingNav, setPendingNav] = useState(null)

  // Fechar/recarregar a aba do navegador com alterações pendentes também
  // avisa (diálogo nativo do browser, fora do nosso controle de texto).
  useEffect(() => {
    if (!configDirty) return undefined
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [configDirty])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    let cancelado = false
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setExibicao(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])
  const menu = isMotoboy
    ? [
        { label: 'Visão geral', icon: LayoutDashboard },
        { label: 'Entregas', icon: Package },
        { label: 'Gastos', icon: Fuel },
        { label: 'Vale', icon: HandCoins },
        { label: 'Relatórios', icon: BarChart3 },
      ]
    : [
        { label: 'Visão geral', icon: LayoutDashboard },
        { label: 'Entregas', icon: Package },
        { label: 'Motoboys', icon: Bike },
        { label: 'Valores Pendentes', icon: Banknote },
        // "Entregas Pendentes" (fluxo logístico) vive dentro da própria tela
        // "Entregas" (sub-navegação interna), não como item de menu
        // separado — ver EntregasView.jsx.
        ...(user?.permitirCadastroClientes ? [{ label: 'Clientes', icon: Contact }] : []),
        { label: 'Gastos', icon: Fuel },
        { label: 'Vale', icon: HandCoins },
        { label: 'Relatórios', icon: BarChart3 },
      ]

  // Retorno do Stripe Checkout: confirma pro usuário e leva direto pra
  // Configurações (onde a Assinatura agora vive), onde o polling decide
  // quando o status realmente confirma.
  useEffect(() => {
    if (checkoutParam === 'success') {
      toast.success('Pagamento em processamento! Confirmando sua assinatura...')
      setActive('Configurações')
    } else if (checkoutParam === 'cancel') {
      toast.error('Assinatura não concluída. Você pode tentar novamente quando quiser.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutParam])

  // 402 vindo de qualquer chamada de API (assinatura inativa): joga o usuário
  // pra Configurações em vez de deixar o erro genérico aparecer sozinho.
  useEffect(() => {
    if (paywall) {
      setActive('Configurações')
      onPaywallHandled?.()
    }
  }, [paywall, onPaywallHandled])

  // Com a gaveta do menu aberta no mobile, trava o scroll do conteúdo por
  // trás dela — sem isso dava pra rolar a página escondida atrás do overlay.
  useEffect(() => {
    if (!navOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  const selectView = (label) => {
    // Saindo da aba Configurações com alteração pendente: pede confirmação
    // em vez de trocar de tela direto e perder o que não foi salvo.
    if (configDirty && active === 'Configurações' && label !== 'Configurações') {
      setPendingNav(label)
      return
    }
    setActive(label)
    setNavOpen(false)
  }

  const confirmarSairSemSalvar = () => {
    setConfigDirty(false)
    setActive(pendingNav)
    setNavOpen(false)
    setPendingNav(null)
  }

  const renderActiveView = () => {
    if (active === 'Motoboys' && !isMotoboy) return <MotoboysView user={user} />
    if (active === 'Valores Pendentes' && !isMotoboy) return <ValoresPendentesView user={user} />
    if (active === 'Clientes' && !isMotoboy && user?.permitirCadastroClientes) return <ClientesView />
    if (active === 'Gastos') return <GastosView user={user} escopoProprio={isMotoboy} />
    if (active === 'Vale') return <ValesView user={user} escopoProprio={isMotoboy} />
    if (active === 'Entregas') return <EntregasView user={user} escopoProprio={isMotoboy} />
    if (active === 'Relatórios') return <RelatoriosView user={user} escopoProprio={isMotoboy} />
    if (active === 'Configurações' && !isMotoboy) {
      return (
        <ConfiguracoesView
          user={user}
          onUserUpdated={onUserUpdated}
          theme={theme}
          onToggleTheme={onToggleTheme}
          accentColor={accentColor}
          onAccentChange={onAccentChange}
          onComoUsar={onComoUsar}
          onConfigDirtyChange={setConfigDirty}
        />
      )
    }
    if (active === 'Minha Conta' && isMotoboy) {
      return (
        <MotoboyContaView
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
          accentColor={accentColor}
          onAccentChange={onAccentChange}
        />
      )
    }
    if (active === 'Painel Geral' && isMaster) return <VisaoGeralMasterView />
    if (active === 'Usuários' && isMaster) return <UsuariosView />
    if (active === 'Assinaturas' && isMaster) return <AssinaturasView />
    if (active === 'Todos os Motoboys' && isMaster) return <MotoboysMasterView />
    if (active === 'Auditoria' && isMaster) return <AuditoriaView />
    if (active === 'Configurações do Sistema' && isMaster) return <ConfiguracaoGlobalView />

    // A view padrão é a Visão Geral
    return <VisaoGeralView user={user} escopoProprio={isMotoboy} />
  }

  return (
    <div className="dashboard-shell">
      <div className={`sidebar-backdrop ${navOpen ? 'visible' : ''}`} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-collapse-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir menu' : 'Encolher menu'}
          title={collapsed ? 'Expandir menu' : 'Encolher menu'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className="sidebar-head">
          <Logo compact={collapsed} dark={theme === 'dark'} />
          <button className="sidebar-close" onClick={() => setNavOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <nav className="side-nav">
          {isMaster && !isMotoboy && (
            <>
              <small className="nav-title">ADMINISTRAÇÃO</small>
              <button className={active === 'Painel Geral' ? 'selected' : ''} onClick={() => selectView('Painel Geral')} title="Painel Geral">
                <Icon icon={LayoutDashboard} /><span>Painel Geral</span>
              </button>
              <button className={active === 'Usuários' ? 'selected' : ''} onClick={() => selectView('Usuários')} title="Usuários">
                <Icon icon={Users} /><span>Usuários</span>
              </button>
              <button className={active === 'Assinaturas' ? 'selected' : ''} onClick={() => selectView('Assinaturas')} title="Assinaturas">
                <Icon icon={Wallet} /><span>Assinaturas</span>
              </button>
              <button className={active === 'Todos os Motoboys' ? 'selected' : ''} onClick={() => selectView('Todos os Motoboys')} title="Todos os Motoboys">
                <Icon icon={Bike} /><span>Todos os Motoboys</span>
              </button>
              <button className={active === 'Auditoria' ? 'selected' : ''} onClick={() => selectView('Auditoria')} title="Auditoria">
                <Icon icon={History} /><span>Auditoria</span>
              </button>
              <button className={active === 'Configurações do Sistema' ? 'selected' : ''} onClick={() => selectView('Configurações do Sistema')} title="Configurações do Sistema">
                <Icon icon={SlidersHorizontal} /><span>Configurações do Sistema</span>
              </button>
            </>
          )}
          <small className={`nav-title ${isMaster && !isMotoboy ? 'nav-spacer' : ''}`}>MENU PRINCIPAL</small>
          {menu.map(item => (
            <button key={item.label} className={active === item.label ? 'selected' : ''} onClick={() => selectView(item.label)} title={item.label}>
              <Icon icon={item.icon} /><span>{item.label}</span>
            </button>
          ))}
          {!isMotoboy && (
            <>
              <small className="nav-title nav-spacer">CONFIGURAÇÕES</small>
              <button className={active === 'Configurações' ? 'selected' : ''} onClick={() => selectView('Configurações')} title="Configurações">
                <Icon icon={Settings} /><span>Configurações</span>
              </button>
            </>
          )}
          {isMotoboy && (
            <>
              <small className="nav-title nav-spacer">CONTA</small>
              <button className={active === 'Minha Conta' ? 'selected' : ''} onClick={() => selectView('Minha Conta')} title="Minha Conta">
                <Icon icon={KeyRound} /><span>Minha Conta</span>
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <a className="support-card" href={montarWhatsappUrl(exibicao?.contatoSuporteWhatsapp)} target="_blank" rel="noreferrer" title="Fale com nosso suporte">
            <span><LifeBuoy size={15} /></span>
            <div><strong>Precisa de ajuda?</strong><small>Fale com nosso suporte</small></div>
          </a>
          <button className="profile" onClick={onLogout} title="Sair da conta">
            {user?.fotoUrl
              ? <img className="profile-avatar" src={user.fotoUrl} alt="" />
              : <span className="profile-avatar">{initials}</span>}
            <span className="profile-info"><strong>{companyName}</strong><small>Sair da conta</small></span>
            <span><LogOut size={collapsed ? 18 : 15} /></span>
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        {exibicao?.bannerHabilitado && (
          <div className="system-banner" role="status">{exibicao.bannerMensagem}</div>
        )}
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setNavOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <div>
            <span className="breadcrumb">Dashboard <b>/</b> {active}</span>
            <h1>{active === 'Visão geral' ? `Olá, ${companyName}.` : active}</h1>
            <p>Acompanhe o que está acontecendo na sua operação.</p>
          </div>
          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <div className="dashboard-content">
          <Suspense fallback={<ViewLoading />}>
            <div key={active} className="view-fade">{renderActiveView()}</div>
          </Suspense>
        </div>
      </main>
      <NovidadePopup config={exibicao} />
      <ConfirmDialog
        isOpen={!!pendingNav}
        title="Alterações não salvas"
        message='Você tem alterações não salvas nas configurações de Entregas. Se sair agora, elas serão perdidas — volte e clique em "Salvar" se quiser mantê-las.'
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        onCancel={() => setPendingNav(null)}
        onConfirm={confirmarSairSemSalvar}
      />
    </div>
  )
}

// Casca própria pro MASTER — só a seção ADMINISTRAÇÃO, sem nada de dono de
// conta (MENU PRINCIPAL, Configurações, banner global, card de suporte,
// NovidadePopup são todos conceitos voltados ao cliente, não ao próprio Master).
function AdminDashboard({ user, onLogout, theme, onToggleTheme }) {
  const displayName = user?.name || 'Master'
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const [active, setActive] = useState('Painel Geral')
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (!navOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  const menu = [
    { label: 'Painel Geral', icon: LayoutDashboard },
    { label: 'Usuários', icon: Users },
    { label: 'Assinaturas', icon: Wallet },
    { label: 'Todos os Motoboys', icon: Bike },
    { label: 'Auditoria', icon: History },
    { label: 'Configurações do Sistema', icon: SlidersHorizontal },
  ]

  const selectView = (label) => {
    setActive(label)
    setNavOpen(false)
  }

  const renderActiveView = () => {
    if (active === 'Usuários') return <UsuariosView />
    if (active === 'Assinaturas') return <AssinaturasView />
    if (active === 'Todos os Motoboys') return <MotoboysMasterView />
    if (active === 'Auditoria') return <AuditoriaView />
    if (active === 'Configurações do Sistema') return <ConfiguracaoGlobalView />
    return <VisaoGeralMasterView />
  }

  return (
    <div className="dashboard-shell">
      <div className={`sidebar-backdrop ${navOpen ? 'visible' : ''}`} onClick={() => setNavOpen(false)} />
      <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-collapse-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir menu' : 'Encolher menu'}
          title={collapsed ? 'Expandir menu' : 'Encolher menu'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className="sidebar-head">
          <Logo compact={collapsed} dark={theme === 'dark'} />
          <button className="sidebar-close" onClick={() => setNavOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <nav className="side-nav">
          <small className="nav-title">ADMINISTRAÇÃO</small>
          {menu.map(item => (
            <button key={item.label} className={active === item.label ? 'selected' : ''} onClick={() => selectView(item.label)} title={item.label}>
              <Icon icon={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="profile" onClick={onLogout} title="Sair da conta">
            {user?.fotoUrl
              ? <img className="profile-avatar" src={user.fotoUrl} alt="" />
              : <span className="profile-avatar">{initials}</span>}
            <span className="profile-info"><strong>{displayName}</strong><small>Sair da conta</small></span>
            <span><LogOut size={collapsed ? 18 : 15} /></span>
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setNavOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <div>
            <span className="breadcrumb">Admin <b>/</b> {active}</span>
            <h1>{active}</h1>
            <p>Painel administrativo do MotoNote.</p>
          </div>
          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <div className="dashboard-content">
          <Suspense fallback={<ViewLoading />}>
            <div key={active} className="view-fade">{renderActiveView()}</div>
          </Suspense>
        </div>
      </main>
    </div>
  )
}

// Guarda de rota autenticada (/dashboard, /admin) — sem sessão, manda pra
// landing ("/"). O componente renderiza null no instante em que percebe que
// não há usuário; o navigate() do efeito troca a URL logo em seguida.
function RequireAuth({ user, children }) {
  const [, navigate] = useLocation()
  useEffect(() => {
    if (!user) navigate('/', { replace: true })
  }, [user, navigate])

  if (!user) return null
  return children
}

// Guarda de rota "só visitante" (/, /login, /register) — com sessão ativa,
// manda direto pro dashboard certo (Master vs. dono de conta) em vez de
// mostrar a landing/formulário de novo. As demais páginas públicas (lp1-3,
// como-usar, termos, privacidade, recuperar-senha) são neutras, de
// propósito, e não usam esta guarda (ver comentário em Dashboard() sobre
// "alguém logado abriu /termos direto").
function RequireGuest({ user, children }) {
  const [, navigate] = useLocation()
  useEffect(() => {
    if (user) navigate(user.role === 'MASTER' ? '/admin' : '/dashboard', { replace: true })
  }, [user, navigate])

  if (user) return null
  return children
}

function App() {
  const [, navigate] = useLocation()
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [theme, setTheme] = useState(getInitialTheme)
  const [accentColor, setAccentColor] = useState(getInitialAccent)
  // Retorno do Stripe Checkout/Portal: o app não tem router, então lemos o
  // query param uma vez no mount e limpamos a URL logo em seguida pra não
  // reprocessar o mesmo retorno num refresh.
  const [checkoutParam] = useState(() => new URLSearchParams(window.location.search).get('checkout'))
  const [paywall, setPaywall] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [accountLocked, setAccountLocked] = useState(false)

  useEffect(() => {
    if (checkoutParam) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [checkoutParam])

  useEffect(() => {
    setOn402Handler(() => setPaywall(true))
  }, [])

  // Token expirado/inválido em qualquer chamada autenticada: desloga e volta
  // pro login com um aviso, em vez de deixar a tela atual travada com um
  // erro genérico (ver on401Handler em services/api.js).
  useEffect(() => {
    setOn401Handler(() => {
      clearSession()
      setUser(null)
      setSessionExpired(true)
      navigate('/login')
    })
  }, [navigate])

  // Conta desativada pelo MASTER em algum momento da sessão (ver
  // AssinaturaGateFilter/SecurityFilter no backend) — mesma ideia do 401
  // acima, mas com um aviso específico em vez de "sessão expirou".
  useEffect(() => {
    setOn423Handler(() => {
      clearSession()
      setUser(null)
      setAccountLocked(true)
      navigate('/login')
    })
  }, [navigate])

  // Sem token em localStorage pra checar antes: a sessão vive num cookie
  // httpOnly que o JS não enxerga, então a única forma de saber se ela
  // existe é tentar buscar o perfil e ver se dá certo. Não chama
  // clearSession() no catch — isso bateria o endpoint de logout em toda
  // visita anônima (landing page), o caso mais comum, só pra limpar um
  // cookie que na pior das hipóteses já vai expirar sozinho. A decisão de
  // redirecionar (ou não) pra dentro do dashboard depois disso fica a
  // cargo de RequireGuest/RequireAuth em cada rota, não daqui.
  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {})
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.accent = accentColor
    localStorage.setItem('accentColor', accentColor)
  }, [accentColor])

  const handleLogin = (currentUser) => {
    setUser(currentUser)
    setSessionExpired(false)
    setAccountLocked(false)
    navigate(currentUser.role === 'MASTER' ? '/admin' : '/dashboard')
  }

  const handleUserUpdated = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
    navigate('/')
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  // "Voltar" das páginas públicas: quem já tem sessão volta pro dashboard
  // certo (não pra landing, que é a tela de quem ainda não entrou).
  const goBackFromPublicPage = () => {
    if (!user) return navigate('/')
    navigate(user.role === 'MASTER' ? '/admin' : '/dashboard')
  }

  const landingProps = {
    onLogin: () => navigate('/login'),
    onSignup: () => navigate('/register'),
    onComoUsar: () => navigate('/como-usar'),
    onTermos: () => navigate('/termos'),
    onPrivacidade: () => navigate('/privacidade'),
  }

  if (checkingSession) return <div className="session-loading">Carregando sua sessão...</div>

  return (
    <Switch>
      <Route path="/login">
        <RequireGuest user={user}>
          <Login
            onBack={() => { setSessionExpired(false); setAccountLocked(false); navigate('/') }}
            onSuccess={handleLogin}
            onSignup={() => navigate('/register')}
            onForgotPassword={() => navigate('/recuperar-senha')}
            notice={
              accountLocked ? 'Esta conta foi desativada. Fale com o suporte para mais informações.'
                : sessionExpired ? 'Sua sessão expirou. Faça login novamente.'
                  : undefined
            }
          />
        </RequireGuest>
      </Route>

      <Route path="/register">
        <RequireGuest user={user}>
          <Suspense fallback={<ViewLoading />}>
            <Cadastro onBack={() => navigate('/')} onGoToLogin={() => navigate('/login')} onSuccess={handleLogin} />
          </Suspense>
        </RequireGuest>
      </Route>

      <Route path="/recuperar-senha">
        <Suspense fallback={<ViewLoading />}>
          <RecuperarSenha onBack={() => navigate('/')} onGoToLogin={() => navigate('/login')} />
        </Suspense>
      </Route>

      <Route path="/como-usar">
        <Suspense fallback={<ViewLoading />}>
          <ComoUsar onBack={goBackFromPublicPage} onTermos={() => navigate('/termos')} onPrivacidade={() => navigate('/privacidade')} />
        </Suspense>
      </Route>

      <Route path="/termos">
        <Suspense fallback={<ViewLoading />}>
          <Termos onBack={goBackFromPublicPage} />
        </Suspense>
      </Route>

      <Route path="/privacidade">
        <Suspense fallback={<ViewLoading />}>
          <Privacidade onBack={goBackFromPublicPage} />
        </Suspense>
      </Route>

      {/* Landing pages alternativas pra campanhas/testes de conversão —
          mesmas props da landing principal, nunca substituem "/". */}
      <Route path="/lp1">
        <Suspense fallback={<ViewLoading />}><LandingLP1 {...landingProps} /></Suspense>
      </Route>
      <Route path="/lp2">
        <Suspense fallback={<ViewLoading />}><LandingLP2 {...landingProps} /></Suspense>
      </Route>
      <Route path="/lp3">
        <Suspense fallback={<ViewLoading />}><LandingLP3 {...landingProps} /></Suspense>
      </Route>

      <Route path="/dashboard">
        <RequireAuth user={user}>
          {user?.role === 'MASTER' ? <Redirect to="/admin" /> : (
            <ToastProvider>
              <Dashboard
                user={user}
                onLogout={handleLogout}
                onUserUpdated={handleUserUpdated}
                theme={theme}
                onToggleTheme={toggleTheme}
                accentColor={accentColor}
                onAccentChange={setAccentColor}
                checkoutParam={checkoutParam}
                paywall={paywall}
                onPaywallHandled={() => setPaywall(false)}
                onComoUsar={() => navigate('/como-usar')}
              />
            </ToastProvider>
          )}
        </RequireAuth>
      </Route>

      <Route path="/admin">
        <RequireAuth user={user}>
          {user?.role !== 'MASTER' ? <Redirect to="/dashboard" /> : (
            <ToastProvider>
              <AdminDashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
            </ToastProvider>
          )}
        </RequireAuth>
      </Route>

      {/* Catch-all: raiz "/" e qualquer caminho desconhecido caem aqui — um
          usuário logado é redirecionado pro dashboard certo (RequireGuest),
          visitante vê a landing principal (mesmo componente de /lp2). */}
      <Route>
        <RequireGuest user={user}>
          <Suspense fallback={<ViewLoading />}><LandingLP2 {...landingProps} /></Suspense>
        </RequireGuest>
      </Route>
    </Switch>
  )
}

export default App
