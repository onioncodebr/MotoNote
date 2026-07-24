import { changeMotoboyPassword } from '../services/api'
import { AlterarSenhaPanel } from './AlterarSenhaPanel'
import { AparenciaPanel } from './AparenciaPanel'

export function MotoboyContaView({ user, theme, onToggleTheme, accentColor, onAccentChange }) {
  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Minha conta</strong>
          <span>Gerencie os dados de acesso ao seu portal.</span>
        </div>
      </div>

      <div className="configuracoes-grid">
        <div className="panel">
          <div className="panel-header"><h2>Meus dados</h2></div>
          <div className="delivery-form">
            <label>
              Nome
              <input type="text" value={user?.name || ''} disabled />
            </label>
            <label>
              E-mail
              <input type="text" value={user?.email || ''} disabled />
            </label>
          </div>
        </div>

        <AlterarSenhaPanel onSubmit={changeMotoboyPassword} />

        <AparenciaPanel theme={theme} onToggleTheme={onToggleTheme} accentColor={accentColor} onAccentChange={onAccentChange} />
      </div>
    </div>
  )
}
