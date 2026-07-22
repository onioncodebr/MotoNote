import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { changePassword, getAssinatura } from '../services/api'
import { STATUS_LABELS } from '../utils/status'
import { AlterarSenhaPanel } from './AlterarSenhaPanel'
import { Skeleton } from './Skeleton'

function PlanoResumo({ onNavigateAssinatura }) {
  const [assinatura, setAssinatura] = useState(null)

  useEffect(() => {
    let cancelado = false
    getAssinatura().then((data) => { if (!cancelado) setAssinatura(data) }).catch(() => {})
    return () => { cancelado = true }
  }, [])

  return (
    <div className="plano-resumo-card">
      <div>
        <small>SEU PLANO</small>
        {assinatura ? <strong>{STATUS_LABELS[assinatura.status] || assinatura.status}</strong> : <Skeleton width={100} height={18} />}
      </div>
      <button type="button" className="outline-link" onClick={onNavigateAssinatura}>
        Ver detalhes <ChevronRight size={15} />
      </button>
    </div>
  )
}

export function ConfiguracoesView({ user, onNavigateAssinatura }) {
  const isMaster = user?.role === 'MASTER'

  return (
    <div className="configuracoes-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Configurações da conta</strong>
          <span>Gerencie os dados de acesso da sua conta.</span>
        </div>
      </div>

      <div className="configuracoes-grid">
        <div className="panel">
          <div className="panel-header"><h2>Dados da conta</h2></div>
          {!isMaster && <PlanoResumo onNavigateAssinatura={onNavigateAssinatura} />}
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
      </div>
    </div>
  )
}
