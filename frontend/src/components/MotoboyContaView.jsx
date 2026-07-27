import { changeMotoboyPassword } from '../services/api'
import { AlterarSenhaPanel } from './AlterarSenhaPanel'
import { AparenciaPanel } from './AparenciaPanel'

export function MotoboyContaView({ user, theme, onToggleTheme, accentColor, onAccentChange }) {
  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar flex flex-wrap justify-between items-center gap-[14px] mb-[22px]">
        <div>
          <strong>Minha conta</strong>
          <span>Gerencie os dados de acesso ao seu portal.</span>
        </div>
      </div>

      <div className="configuracoes-grid grid grid-cols-[320px_1fr] max-[1080px]:grid-cols-1 gap-[14px] mt-[14px] items-start">
        <div className="panel bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-[var(--radius-md)] p-[var(--space-5)] min-w-0 shadow-[var(--shadow-sm)] transition-[background,border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]">
          <div className="panel-header flex flex-wrap justify-between items-start gap-3"><h2>Meus dados</h2></div>
          <div className="delivery-form grid gap-4 mt-5">
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
