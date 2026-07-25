import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowDown, TrendingUp, CheckCircle2,
  LayoutGrid, FileBarChart, Sparkles, Eye, EyeOff, Sun, Moon,
  X, Menu, LifeBuoy, LogOut, LayoutDashboard, Package, Bike,
  BarChart3, Settings, Gift, ShieldCheck, Ban, Coffee,
  ChevronLeft, ChevronRight, KeyRound, Banknote, Fuel, HandCoins,
  Users, Wallet, History, SlidersHorizontal,
} from 'lucide-react'
import { clearSession, getCurrentUser, login as authenticate, setOn402Handler, setOn401Handler, setOn423Handler, getPlano, getConfiguracaoExibicao } from './services/api'
import { formatarMoeda } from './utils/format'
import { montarWhatsappUrl } from './utils/whatsapp'
import './App.css'
import { ToastProvider, useToast } from './components/Toast'
import { Logo } from './components/Logo'
import { Reveal } from './components/Reveal'
import { NovidadePopup } from './components/NovidadePopup'
import { Turnstile } from './components/Turnstile'

// Cada view só é baixada quando o usuário realmente navega até ela — antes
// disso tudo entrava num único bundle inicial, então o login (por exemplo)
// esperava o JS de Usuários, Relatórios etc. mesmo sem precisar de nenhum
// deles ainda.
const Cadastro = lazy(() => import('./components/Cadastro').then((m) => ({ default: m.Cadastro })))
const RecuperarSenha = lazy(() => import('./components/RecuperarSenha').then((m) => ({ default: m.RecuperarSenha })))
const ComoUsar = lazy(() => import('./components/ComoUsar').then((m) => ({ default: m.ComoUsar })))
const Termos = lazy(() => import('./components/Termos').then((m) => ({ default: m.Termos })))
const Privacidade = lazy(() => import('./components/Privacidade').then((m) => ({ default: m.Privacidade })))
const MotoboysView = lazy(() => import('./components/MotoboysView').then((m) => ({ default: m.MotoboysView })))
const EntregasView = lazy(() => import('./components/EntregasView').then((m) => ({ default: m.EntregasView })))
const RelatoriosView = lazy(() => import('./components/RelatoriosView').then((m) => ({ default: m.RelatoriosView })))
const VisaoGeralView = lazy(() => import('./components/VisaoGeralView').then((m) => ({ default: m.VisaoGeralView })))
const ValoresPendentesView = lazy(() => import('./components/ValoresPendentesView').then((m) => ({ default: m.ValoresPendentesView })))
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
  return <div className="view-loading">Carregando...</div>
}

// O app não usa uma lib de rotas — são só 3 URLs públicas e estáticas, dá
// pra sincronizar isso com o state machine de "screen" que já existe (ver
// App()) via pushState/popstate, sem trazer react-router pra isso.
const PATH_SCREENS = { '/como-usar': 'como-usar', '/termos': 'termos', '/privacidade': 'privacidade' }

function getPathScreen() {
  if (typeof window === 'undefined') return null
  return PATH_SCREENS[window.location.pathname] || null
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

// Anima uma seção pra dentro (fade + leve translateY) quando ela entra na
// viewport. Se o navegador não suportar IntersectionObserver, ou algo dar
// errado ao configurá-lo, o conteúdo cai de volta a visível imediatamente —
// nunca fica escondido dependendo só do JS funcionar perfeitamente.
function Landing({ onLogin, onSignup, onComoUsar, onTermos, onPrivacidade }) {
  const [plano, setPlano] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    let cancelado = false
    getPlano().then((data) => { if (!cancelado) setPlano(data) }).catch(() => {})
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setConfig(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])

  const trialDays = plano?.trialDays ?? 15
  const whatsappUrl = montarWhatsappUrl(config?.contatoSuporteWhatsapp)

  return (
    <div className="landing-page">
      <header className="landing-nav page-width">
        <Logo subtitle />
        <nav><a href="#recursos">Recursos</a><a href="#visao">Como funciona</a><a href="#como-usar" onClick={(e) => { e.preventDefault(); onComoUsar() }}>Como usar</a><a href={whatsappUrl} target="_blank" rel="noreferrer">Fale conosco</a></nav>
        <div className="landing-nav-actions">
          <button className="button button-outline" onClick={onLogin}>Entrar <span><ArrowRight size={17} /></span></button>
          <button className="button button-dark" onClick={onSignup}>Iniciar teste grátis</button>
        </div>
      </header>
      <main>
        <section className="hero-section page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> {trialDays} dias grátis, sem compromisso</div>
            <h1>Entregas mais simples.<br /><em>Resultados melhores.</em></h1>
            <p>Organize sua operação, acompanhe seus motoboys e tenha o controle financeiro da sua empresa em um só lugar.</p>
            <div className="hero-actions"><button className="button button-dark" onClick={onSignup}>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></button><a href="#recursos" className="text-link">Conheça a plataforma <span><ArrowDown size={17} /></span></a></div>
            <ul className="trial-badges">
              <li><Gift size={14} /> {trialDays} dias grátis</li>
              <li><ShieldCheck size={14} /> Sem cobrança no teste</li>
              <li><Ban size={14} /> Cancele quando quiser</li>
            </ul>
            {plano && <p className="trial-price-note">Depois do teste, <strong>{formatarMoeda(plano.valorMensal)}/mês</strong>. Cancele antes disso e não paga nada.</p>}
            {plano && <p className="coffee-note"><Coffee size={14} /> Menos de <strong>{formatarMoeda(plano.valorMensal / 30)}</strong> por dia — menos que um cafézinho.</p>}
            <div className="hero-proof"><div className="avatar-stack"><i /><i /><i /><i /></div><span><strong>Construído para operações reais de entrega.</strong><br />Controle sua operação com clareza.</span></div>
          </div>
          <div className="hero-art" aria-label="Resumo da operação de entregas">
            <div className="art-glow" />
            <div className="floating-card floating-top"><span className="mini-icon green-bg"><TrendingUp size={15} strokeWidth={2.5} /></span><div><small>Entregas hoje</small><strong>+24,8%</strong></div></div>
            <div className="dashboard-preview">
              <div className="preview-header"><Logo compact /><span className="preview-menu">•••</span></div>
              <div className="preview-greeting"><small>Visão geral</small><strong>Bom dia, empresa!</strong></div>
              <div className="preview-stats"><div><small>Entregas</small><strong>128</strong><span>+12,5%</span></div><div><small>Faturamento</small><strong>R$ 4.280</strong><span>+8,2%</span></div></div>
              <div className="preview-chart"><div className="chart-label"><span>Entregas por período</span><small>Últimos 7 dias</small></div><div className="preview-graph"><div className="preview-grid-lines"><i /><i /><i /></div><svg viewBox="0 0 300 100" preserveAspectRatio="none"><polyline points="0,57 50,41 100,52 150,26 200,37 250,10 300,22" fill="none" stroke="var(--chart-1)" strokeWidth="2.5" /></svg></div><div className="chart-days"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div></div>
              <div className="preview-riders"><div className="chart-label"><span>Motoboys ativos</span><small>Ver todos →</small></div><div className="rider-row"><span className="rider-avatar green">CM</span><span>Carlos Mendes</span><b>42 entregas</b></div><div className="rider-row"><span className="rider-avatar blue">RS</span><span>Rafael Souza</span><b>36 entregas</b></div></div>
            </div>
            <div className="floating-card floating-bottom"><span className="mini-icon dark-bg"><CheckCircle2 size={15} strokeWidth={2.5} /></span><div><small>Operação em dia</small><strong>100% organizada</strong></div></div>
          </div>
        </section>
        <Reveal as="section" className="features-section page-width" id="recursos"><div className="section-heading"><div className="eyebrow">Tudo sob controle</div><h2>A operação que você precisa,<br /><em>sem complicação.</em></h2><p>Uma visão clara para decisões melhores todos os dias.</p></div><div className="feature-grid"><article><span className="feature-icon"><LayoutGrid size={19} /></span><h3>Visão completa</h3><p>Acompanhe entregas, valores e desempenho em tempo real.</p></article><article><span className="feature-icon"><FileBarChart size={19} /></span><h3>Relatórios precisos</h3><p>Gere relatórios diários, semanais e mensais para sua empresa.</p></article><article><span className="feature-icon"><Sparkles size={19} /></span><h3>Mais organização</h3><p>Centralize seus motoboys e torne sua rotina mais eficiente.</p></article></div></Reveal>
        <Reveal as="section" className="how-section page-width" id="visao">
          <div className="section-heading">
            <div className="eyebrow">Como funciona</div>
            <h2>Comece a organizar sua<br /><em>operação em 3 passos.</em></h2>
            <p>Do cadastro ao fechamento financeiro, sem planilhas soltas.</p>
          </div>
          <div className="how-grid">
            <article>
              <span className="how-step">1</span>
              <h3>Cadastre seus motoboys</h3>
              <p>Adicione a equipe que realiza as entregas em poucos segundos, sem burocracia.</p>
            </article>
            <article>
              <span className="how-step">2</span>
              <h3>Registre cada entrega</h3>
              <p>Lance o valor, o motoboy responsável e a data em que a entrega foi realizada.</p>
            </article>
            <article>
              <span className="how-step">3</span>
              <h3>Acompanhe os resultados</h3>
              <p>Veja a visão geral em tempo real e gere relatórios por período sempre que precisar.</p>
            </article>
          </div>
        </Reveal>
        <Reveal as="section" className="contact-banner page-width" id="contato"><div><div className="eyebrow">Pronto para começar?</div><h2>Leve mais clareza para<br /><em>sua operação.</em></h2></div><a className="button button-light" href={whatsappUrl} target="_blank" rel="noreferrer">Falar com a gente <span><ArrowRight size={17} /></span></a></Reveal>
      </main>
      <footer className="landing-footer page-width"><Logo subtitle /><span>© 2026 MotoNote. Gestão que movimenta.</span><a href="/como-usar" className="text-link" onClick={(e) => { e.preventDefault(); onComoUsar() }}>Como usar</a><a href="/termos" className="text-link" onClick={(e) => { e.preventDefault(); onTermos() }}>Termos de Uso</a><a href="/privacidade" className="text-link" onClick={(e) => { e.preventDefault(); onPrivacidade() }}>Privacidade</a><span>Copyright by OnionCode</span></footer>
    </div>
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

  return <div className="auth-page"><div className="auth-image"><button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar para o início</button><div className="auth-quote"><span>“</span><p>Organize sua operação.<br /><em>Entregue melhores resultados.</em></p><small>MotoNote</small></div><div className="auth-image-footer"><Logo /><span>Gestão inteligente para quem entrega.</span></div></div><div className="auth-form-wrap"><div className="auth-form"><div className="auth-mobile-logo"><Logo /></div><div className="eyebrow">Bem-vindo de volta</div><h1>Acesse sua conta</h1><p className="auth-subtitle">Entre para acompanhar sua operação de entregas.</p><form onSubmit={submit}><label>E-mail<input type="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Senha<div className="password-field"><input type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={-1}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><div className="form-options"><a href="#recuperar-senha" onClick={(e) => { e.preventDefault(); onForgotPassword() }}>Esqueci minha senha</a></div><Turnstile ref={turnstileRef} onVerify={setCaptchaToken} />{notice && <p className="auth-notice" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-dark full-button" disabled={loading}>{loading ? 'Entrando...' : <>Entrar na plataforma <span><ArrowRight size={17} /></span></>}</button></form><p className="auth-help">Ainda não tem conta? <a href="#criar-conta" onClick={(e) => { e.preventDefault(); onSignup() }}>Iniciar teste grátis</a></p></div></div></div>
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
    setActive(label)
    setNavOpen(false)
  }

  const renderActiveView = () => {
    if (active === 'Motoboys' && !isMotoboy) return <MotoboysView user={user} />
    if (active === 'Valores Pendentes' && !isMotoboy) return <ValoresPendentesView user={user} />
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
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />}
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
          <Suspense fallback={<ViewLoading />}>{renderActiveView()}</Suspense>
        </div>
      </main>
      <NovidadePopup config={exibicao} />
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState(() => getPathScreen() || 'landing')
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
      setScreen('login')
    })
  }, [])

  // Conta desativada pelo MASTER em algum momento da sessão (ver
  // AssinaturaGateFilter/SecurityFilter no backend) — mesma ideia do 401
  // acima, mas com um aviso específico em vez de "sessão expirou".
  useEffect(() => {
    setOn423Handler(() => {
      clearSession()
      setUser(null)
      setAccountLocked(true)
      setScreen('login')
    })
  }, [])

  // Sem token em localStorage pra checar antes: a sessão vive num cookie
  // httpOnly que o JS não enxerga, então a única forma de saber se ela
  // existe é tentar buscar o perfil e ver se dá certo. Não chama
  // clearSession() no catch — isso bateria o endpoint de logout em toda
  // visita anônima (landing page), o caso mais comum, só pra limpar um
  // cookie que na pior das hipóteses já vai expirar sozinho.
  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        // Se a URL já é uma página pública (ex.: alguém logado abriu
        // /termos direto), não chuta pro dashboard por cima dela.
        if (!getPathScreen()) setScreen('dashboard')
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
  }, [])

  // Navegação real (pushState) pras 3 páginas públicas — dá URL própria,
  // funciona com recarregar a página e com nova aba, sem precisar de uma
  // lib de rotas só pra isso.
  const navigateTo = (path, nextScreen) => {
    window.history.pushState({}, '', path)
    setScreen(nextScreen)
  }

  useEffect(() => {
    const onPopState = () => setScreen(getPathScreen() || (user ? 'dashboard' : 'landing'))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [user])

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
    setScreen('dashboard')
  }

  const handleUserUpdated = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setScreen('landing')
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  if (checkingSession) return <div className="session-loading">Carregando sua sessão...</div>
  if (screen === 'login') {
    return (
      <Login
        onBack={() => { setSessionExpired(false); setAccountLocked(false); setScreen('landing') }}
        onSuccess={handleLogin}
        onSignup={() => setScreen('cadastro')}
        onForgotPassword={() => setScreen('recuperar-senha')}
        notice={
          accountLocked ? 'Esta conta foi desativada. Fale com o suporte para mais informações.'
            : sessionExpired ? 'Sua sessão expirou. Faça login novamente.'
              : undefined
        }
      />
    )
  }
  if (screen === 'cadastro') {
    return (
      <Suspense fallback={<ViewLoading />}>
        <Cadastro onBack={() => setScreen('landing')} onGoToLogin={() => setScreen('login')} onSuccess={handleLogin} />
      </Suspense>
    )
  }
  if (screen === 'recuperar-senha') {
    return (
      <Suspense fallback={<ViewLoading />}>
        <RecuperarSenha onBack={() => setScreen('landing')} onGoToLogin={() => setScreen('login')} />
      </Suspense>
    )
  }
  // "Voltar" das páginas públicas: quem já tem sessão volta pro dashboard
  // (não pra landing, que é a tela de quem ainda não entrou).
  const goBackFromPublicPage = () => navigateTo('/', user ? 'dashboard' : 'landing')

  if (screen === 'como-usar') {
    return (
      <Suspense fallback={<ViewLoading />}>
        <ComoUsar onBack={goBackFromPublicPage} onTermos={() => navigateTo('/termos', 'termos')} onPrivacidade={() => navigateTo('/privacidade', 'privacidade')} />
      </Suspense>
    )
  }
  if (screen === 'termos') {
    return (
      <Suspense fallback={<ViewLoading />}>
        <Termos onBack={goBackFromPublicPage} />
      </Suspense>
    )
  }
  if (screen === 'privacidade') {
    return (
      <Suspense fallback={<ViewLoading />}>
        <Privacidade onBack={goBackFromPublicPage} />
      </Suspense>
    )
  }
  if (screen === 'dashboard') {
    return (
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
          onComoUsar={() => navigateTo('/como-usar', 'como-usar')}
        />
      </ToastProvider>
    )
  }
  return (
    <Landing
      onLogin={() => setScreen('login')}
      onSignup={() => setScreen('cadastro')}
      onComoUsar={() => navigateTo('/como-usar', 'como-usar')}
      onTermos={() => navigateTo('/termos', 'termos')}
      onPrivacidade={() => navigateTo('/privacidade', 'privacidade')}
    />
  )
}

export default App
