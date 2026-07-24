import { useState } from 'react'
import { changePassword, updateNome } from '../services/api'
import { AlterarSenhaPanel } from './AlterarSenhaPanel'
import { AlterarTelefonePanel } from './AlterarTelefonePanel'
import { AparenciaPanel } from './AparenciaPanel'
import { AssinaturaView } from './AssinaturaView'

export function ConfiguracoesView({ user, onUserUpdated, theme, onToggleTheme, accentColor, onAccentChange }) {
  const isMaster = user?.role === 'MASTER'
  // "USER" é o papel padrão de quem assina o SaaS — não traz nenhuma
  // informação nova pra essa conta, então só mostramos o rótulo pra
  // ADMIN/MASTER, onde a distinção realmente importa.
  const mostrarRole = user?.role && user.role !== 'USER'

  const [name, setName] = useState(user?.name || '')
  const [nomeError, setNomeError] = useState('')
  const [nomeSuccess, setNomeSuccess] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

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
        <div className="panel">
          <div className="panel-header"><h2>Dados da conta</h2></div>
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
            <button type="submit" className="button button-dark small-button" disabled={salvandoNome || name.trim() === user?.name}>
              {salvandoNome ? 'Salvando...' : 'Salvar nome'}
            </button>
          </form>
        </div>

        <AlterarTelefonePanel telefoneAtual={user?.phone} onConfirmed={(phone) => onUserUpdated?.({ phone })} />

        <AlterarSenhaPanel onSubmit={changePassword} />

        {!isMaster && (
          <div className="configuracoes-grid-full">
            <AssinaturaView />
          </div>
        )}

        <AparenciaPanel theme={theme} onToggleTheme={onToggleTheme} accentColor={accentColor} onAccentChange={onAccentChange} />
      </div>
    </div>
  )
}
