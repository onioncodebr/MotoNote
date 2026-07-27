import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  atualizarConfiguracaoSistema, getConfiguracaoSistema,
  atualizarCadastroPublico, atualizarRateLimit, atualizarBanner,
  atualizarContatoSuporte, atualizarPopup,
} from '../services/api'
import { Button } from './Button'
import { useToast } from './Toast'

// Ajustes operacionais do SaaS, aplicados a todos os clientes — cada painel
// salva de forma independente (endpoint próprio), pra não arriscar
// sobrescrever um ajuste ao salvar outro.
export function ConfiguracaoGlobalView() {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    getConfiguracaoSistema()
      .then((data) => { if (!cancelado) setConfig(data) })
      .catch((err) => { if (!cancelado) setError(err.message || 'Não foi possível carregar as configurações.') })
      .finally(() => { if (!cancelado) setIsLoading(false) })
    return () => { cancelado = true }
  }, [])

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Configurações globais</strong>
          <span>Ajustes operacionais do SaaS, aplicados a todos os clientes.</span>
        </div>
      </div>

      <div className="configuracoes-grid">
        <TrialPanel isLoading={isLoading} config={config} toast={toast} />
        <CadastroPublicoPanel isLoading={isLoading} config={config} toast={toast} />
        <RateLimitPanel isLoading={isLoading} config={config} toast={toast} />
        <BannerPanel isLoading={isLoading} config={config} toast={toast} />
        <ContatoSuportePanel isLoading={isLoading} config={config} toast={toast} />
        <PopupPanel isLoading={isLoading} config={config} toast={toast} />
      </div>
    </div>
  )
}

function TrialPanel({ isLoading, config, toast }) {
  const [trialDays, setTrialDays] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => { if (config) setTrialDays(String(config.trialDays ?? '')) }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valor = Number(trialDays)
    if (!valor || valor <= 0) {
      toast.error('Informe uma quantidade de dias válida.')
      return
    }
    setIsSaving(true)
    try {
      const atualizado = await atualizarConfiguracaoSistema(valor)
      setTrialDays(String(atualizado.trialDays))
      toast.success('Configuração salva.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Trial de novos cadastros</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label>
          Dias de trial para novos cadastros
          <input type="number" min={1} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} disabled={isLoading} required />
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}

function CadastroPublicoPanel({ isLoading, config, toast }) {
  const [habilitado, setHabilitado] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => { if (config) setHabilitado(config.cadastroPublicoHabilitado) }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const atualizado = await atualizarCadastroPublico(habilitado)
      setHabilitado(atualizado.cadastroPublicoHabilitado)
      toast.success('Configuração salva.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Cadastro público</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label className="terms-check">
          <input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} disabled={isLoading} />
          <span>Permitir que novos visitantes criem conta pela tela de cadastro</span>
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}

function RateLimitPanel({ isLoading, config, toast }) {
  const [loginMax, setLoginMax] = useState('')
  const [geralMax, setGeralMax] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setLoginMax(String(config.rateLimitLoginMaxTentativas ?? ''))
      setGeralMax(String(config.rateLimitGeralMaxTentativas ?? ''))
    }
  }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const login = Number(loginMax)
    const geral = Number(geralMax)
    if (!login || login <= 0 || !geral || geral <= 0) {
      toast.error('Informe valores válidos pros dois limites.')
      return
    }
    setIsSaving(true)
    try {
      const atualizado = await atualizarRateLimit(login, geral)
      setLoginMax(String(atualizado.rateLimitLoginMaxTentativas))
      setGeralMax(String(atualizado.rateLimitGeralMaxTentativas))
      toast.success('Configuração salva.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Limites de requisições</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label>
          Tentativas de login por IP (janela de 5 min)
          <input type="number" min={1} value={loginMax} onChange={(e) => setLoginMax(e.target.value)} disabled={isLoading} required />
        </label>
        <label>
          Requisições gerais por IP (janela de 1 min)
          <input type="number" min={1} value={geralMax} onChange={(e) => setGeralMax(e.target.value)} disabled={isLoading} required />
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}

function BannerPanel({ isLoading, config, toast }) {
  const [habilitado, setHabilitado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setHabilitado(config.bannerHabilitado)
      setMensagem(config.bannerMensagem || '')
    }
  }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (habilitado && !mensagem.trim()) {
      toast.error('Informe a mensagem do banner.')
      return
    }
    setIsSaving(true)
    try {
      const atualizado = await atualizarBanner(habilitado, mensagem.trim())
      setHabilitado(atualizado.bannerHabilitado)
      setMensagem(atualizado.bannerMensagem || '')
      toast.success('Configuração salva.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Aviso global</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label className="terms-check">
          <input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} disabled={isLoading} />
          <span>Mostrar aviso no topo do dashboard de todos os clientes</span>
        </label>
        <label>
          Mensagem
          <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} disabled={isLoading} placeholder="Ex.: Manutenção programada para sexta às 22h." />
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}

function ContatoSuportePanel({ isLoading, config, toast }) {
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setWhatsapp(config.contatoSuporteWhatsapp || '')
      setEmail(config.contatoSuporteEmail || '')
    }
  }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const atualizado = await atualizarContatoSuporte(whatsapp.trim(), email.trim())
      setWhatsapp(atualizado.contatoSuporteWhatsapp || '')
      setEmail(atualizado.contatoSuporteEmail || '')
      toast.success('Configuração salva.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Contato de suporte</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label>
          WhatsApp (só números, com DDI)
          <input type="text" placeholder="5547988641051" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={isLoading} />
        </label>
        <label>
          E-mail
          <input type="email" placeholder="suporte@seudominio.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}

function PopupPanel({ isLoading, config, toast }) {
  const [habilitado, setHabilitado] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [botaoTexto, setBotaoTexto] = useState('')
  const [botaoUrl, setBotaoUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setHabilitado(config.popupHabilitado)
      setTitulo(config.popupTitulo || '')
      setDescricao(config.popupDescricao || '')
      setBotaoTexto(config.popupBotaoTexto || '')
      setBotaoUrl(config.popupBotaoUrl || '')
    }
  }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (habilitado && (!titulo.trim() || !descricao.trim())) {
      toast.error('Informe pelo menos título e descrição do popup.')
      return
    }
    setIsSaving(true)
    try {
      const atualizado = await atualizarPopup(habilitado, titulo.trim(), descricao.trim(), botaoTexto.trim(), botaoUrl.trim())
      setHabilitado(atualizado.popupHabilitado)
      toast.success('Configuração salva — a próxima visita de cada cliente já mostra o popup atualizado.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar a configuração.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel configuracoes-grid-full">
      <div className="panel-header"><h2>Popup de novidade</h2></div>
      <form className="delivery-form" onSubmit={handleSubmit}>
        <label className="terms-check">
          <input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} disabled={isLoading} />
          <span>Mostrar popup de novidade pros clientes (uma vez por versão salva)</span>
        </label>
        <label>
          Título
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={isLoading} placeholder="Ex.: Nova função de relatórios!" />
        </label>
        <label>
          Descrição
          <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={isLoading} placeholder="Conte rapidamente o que mudou." />
        </label>
        <label>
          Texto do botão
          <input type="text" value={botaoTexto} onChange={(e) => setBotaoTexto(e.target.value)} disabled={isLoading} placeholder="Saiba mais" />
        </label>
        <label>
          Link do botão (opcional)
          <input type="text" value={botaoUrl} onChange={(e) => setBotaoUrl(e.target.value)} disabled={isLoading} placeholder="https://..." />
        </label>
        <Button type="submit" variant="dark" size="small" disabled={isLoading || isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar e publicar'}
        </Button>
      </form>
    </div>
  )
}
