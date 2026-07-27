import { useEffect, useState } from 'react'
import { LifeBuoy, BookOpen } from 'lucide-react'
import { getConfiguracaoExibicao, updateNome } from '../services/api'
import { montarWhatsappUrl } from '../utils/whatsapp'
import { AlterarSenhaComCodigoPanel } from './AlterarSenhaComCodigoPanel'
import { AlterarTelefonePanel } from './AlterarTelefonePanel'
import { AparenciaPanel } from './AparenciaPanel'
import { AssinaturaView } from './AssinaturaView'
import { Button } from './Button'
import { FotoPerfilPanel } from './FotoPerfilPanel'

export function ConfiguracoesView({ user, onUserUpdated, theme, onToggleTheme, accentColor, onAccentChange, onComoUsar }) {
  const isMaster = user?.role === 'MASTER'
  // "USER" é o papel padrão de quem assina o SaaS — não traz nenhuma
  // informação nova pra essa conta, então só mostramos o rótulo pra
  // ADMIN/MASTER, onde a distinção realmente importa.
  const mostrarRole = user?.role && user.role !== 'USER'

  const [name, setName] = useState(user?.name || '')
  const [nomeError, setNomeError] = useState('')
  const [nomeSuccess, setNomeSuccess] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  // Mesmo endpoint público que Landing/Dashboard já consultam cada um por
  // conta própria (ver App.jsx) — aqui é só pro link "Falar com o suporte".
  const [exibicao, setExibicao] = useState(null)
  useEffect(() => {
    let cancelado = false
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setExibicao(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])
  const whatsappUrl = montarWhatsappUrl(exibicao?.contatoSuporteWhatsapp)

  const salvarNome = async (e) => {
    e.preventDefault()
    setNomeError('')
    setNomeSuccess('')

    if (!name.trim()) {
      setNomeError('O nome não pode ficar em branco.')
      return
    }

    setSalvandoNome(true)
    try {
      const atualizado = await updateNome(name.trim())
      onUserUpdated?.({ name: atualizado.name })
      setNomeSuccess('Nome atualizado com sucesso.')
    } catch (requestError) {
      setNomeError(requestError.message || 'Não foi possível atualizar o nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Configurações da conta</strong>
          <span>Gerencie os dados de acesso, a assinatura e a aparência do sistema.</span>
        </div>
      </div>

      <div className="configuracoes-grid">
        <div className="configuracoes-grid-full panel">
          <div className="panel-header"><h2>Perfil</h2></div>
          <div className="panel-perfil-body">
            <FotoPerfilPanel nome={user?.name} fotoUrl={user?.fotoUrl} onUpdated={(fotoUrl) => onUserUpdated?.({ fotoUrl })} />
            <form className="delivery-form" onSubmit={salvarNome}>
              <label>
                Nome
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                E-mail
                <input type="text" value={user?.email || ''} disabled />
              </label>
              {mostrarRole && (
                <label>
                  Perfil de acesso
                  <input type="text" value={user.role} disabled />
                </label>
              )}
              {nomeError && <p className="form-error">{nomeError}</p>}
              {nomeSuccess && <p className="form-success">{nomeSuccess}</p>}
              <Button type="submit" variant="dark" size="small" disabled={salvandoNome || name.trim() === user?.name}>
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </Button>
            </form>
          </div>
          <div className="perfil-subcampos">
            <AlterarTelefonePanel telefoneAtual={user?.phone} onConfirmed={(phone) => onUserUpdated?.({ phone })} />
            <AlterarSenhaComCodigoPanel />
          </div>
        </div>

        {!isMaster && (
          <>
            <h3 className="configuracoes-section-title configuracoes-grid-full">Assinatura</h3>
            <div className="configuracoes-grid-full">
              <AssinaturaView />
            </div>
          </>
        )}

        <h3 className="configuracoes-section-title configuracoes-grid-full">Aparência</h3>
        <AparenciaPanel theme={theme} onToggleTheme={onToggleTheme} accentColor={accentColor} onAccentChange={onAccentChange} />

        <h3 className="configuracoes-section-title configuracoes-grid-full">Ajuda</h3>
        <div className="panel ajuda-card">
          <div className="panel-header"><h2><LifeBuoy size={17} /> Falar com o suporte</h2></div>
          <p>Ficou com alguma dúvida ou precisa de ajuda? Fale direto com a gente pelo WhatsApp.</p>
          <Button as="a" variant="outline" size="small" href={whatsappUrl} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </Button>
        </div>
        <div className="panel ajuda-card">
          <div className="panel-header"><h2><BookOpen size={17} /> Como usar o sistema</h2></div>
          <p>Veja um guia completo de como aproveitar melhor o MotoNote no dia a dia.</p>
          <Button type="button" variant="outline" size="small" onClick={onComoUsar}>
            Ver como usar
          </Button>
        </div>
      </div>
    </div>
  )
}
