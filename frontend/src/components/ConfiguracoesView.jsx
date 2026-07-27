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
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Configurações da conta</strong>
          <span>Gerencie os dados de acesso, a assinatura e a aparência do sistema.</span>
        </div>
      </div>

      <div className="configuracoes-grid grid grid-cols-[320px_1fr] max-[1080px]:grid-cols-1 gap-[14px] mt-[14px] items-start">
        <div className="col-span-full panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2>Perfil</h2></div>
          <div className="flex gap-[28px] items-start mt-5 max-sm:flex-col max-sm:items-center">
            <FotoPerfilPanel nome={user?.name} fotoUrl={user?.fotoUrl} onUpdated={(fotoUrl) => onUserUpdated?.({ fotoUrl })} />
            <form className="delivery-form grid gap-4 mt-0 flex-[1_1_260px] max-sm:w-full" onSubmit={salvarNome}>
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
              {nomeError && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{nomeError}</p>}
              {nomeSuccess && <p className="text-[var(--color-success)] text-[length:var(--fs-sm)] -mt-1 mb-0">{nomeSuccess}</p>}
              <Button type="submit" variant="dark" size="small" disabled={salvandoNome || name.trim() === user?.name}>
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-8 mt-6 pt-5 border-t border-[var(--dash-border)]">
            <AlterarTelefonePanel telefoneAtual={user?.phone} onConfirmed={(phone) => onUserUpdated?.({ phone })} />
            <AlterarSenhaComCodigoPanel />
          </div>
        </div>

        {!isMaster && (
          <>
            <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Assinatura</h3>
            <div className="col-span-full">
              <AssinaturaView />
            </div>
          </>
        )}

        <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Aparência</h3>
        <AparenciaPanel theme={theme} onToggleTheme={onToggleTheme} accentColor={accentColor} onAccentChange={onAccentChange} />

        <h3 className="col-span-full mt-2 -mb-1 pt-5 border-t border-[var(--dash-border)] text-[var(--dash-text-faint)] font-bold text-[length:var(--fs-xs)] tracking-[0.5px] uppercase">Ajuda</h3>
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] ajuda-card">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2><LifeBuoy size={17} /> Falar com o suporte</h2></div>
          <p>Ficou com alguma dúvida ou precisa de ajuda? Fale direto com a gente pelo WhatsApp.</p>
          <Button as="a" variant="outline" size="small" href={whatsappUrl} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </Button>
        </div>
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)] ajuda-card">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2><BookOpen size={17} /> Como usar o sistema</h2></div>
          <p>Veja um guia completo de como aproveitar melhor o MotoNote no dia a dia.</p>
          <Button type="button" variant="outline" size="small" onClick={onComoUsar}>
            Ver como usar
          </Button>
        </div>
      </div>
    </div>
  )
}
