import { changePassword } from '../services/api'
import { AlterarSenhaPanel } from './AlterarSenhaPanel'
import { AparenciaPanel } from './AparenciaPanel'
import { AssinaturaView } from './AssinaturaView'

export function ConfiguracoesView({ user, theme, onToggleTheme, accentColor, onAccentChange }) {
  const isMaster = user?.role === 'MASTER'

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
          <div className="delivery-form">
            <label>
              Nome
              <input type="text" value={user?.name || ''} disabled />
            </label>
            <label>
              E-mail
              <input type="text" value={user?.email || ''} disabled />
            </label>
            <label>
              Perfil de acesso
              <input type="text" value={user?.role || ''} disabled />
            </label>
          </div>
        </div>

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
