import { useEffect, useState } from 'react'
import { CreditCard, Clock, ShieldCheck, AlertTriangle, XCircle, CalendarClock } from 'lucide-react'
import { getAssinatura, createCheckoutSession, createPortalSession, getPlano } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { STATUS_LABELS, STATUS_CLASSES } from '../utils/status'
import { Skeleton } from './Skeleton'
import { useToast } from './Toast'

function formatarData(instant) {
  if (!instant) return null
  return new Date(instant).toLocaleDateString('pt-BR')
}

// Dias corridos entre agora e o fim do trial, pra mostrar contagem regressiva
// e a barra de progresso (ex.: "faltam 9 dias" / "68% do teste já passou").
function diasRestantes(trialTerminaEm) {
  if (!trialTerminaEm) return null
  const ms = new Date(trialTerminaEm).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function AssinaturaView() {
  const toast = useToast()
  const [assinatura, setAssinatura] = useState(null)
  const [plano, setPlano] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getPlano().then(setPlano).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelado = false
    let tentativas = 0

    async function buscar() {
      try {
        const data = await getAssinatura()
        if (cancelado) return
        setAssinatura(data)
        setIsLoading(false)

        // Corrida entre o retorno síncrono do Checkout e o webhook assíncrono
        // que de fato atualiza o status: continua tentando por alguns
        // segundos antes de desistir e deixar o status como está.
        const aindaConfirmando = data.status === 'SEM_ASSINATURA' || data.status === 'INCOMPLETA'
        if (aindaConfirmando && tentativas < 5) {
          tentativas += 1
          setTimeout(buscar, 2000)
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'Não foi possível carregar sua assinatura.')
          setIsLoading(false)
        }
      }
    }

    buscar()
    return () => { cancelado = true }
  }, [])

  const assinar = async () => {
    setActionLoading(true)
    try {
      const { checkoutUrl } = await createCheckoutSession()
      window.location.href = checkoutUrl
    } catch (err) {
      toast.error(err.message || 'Não foi possível iniciar o checkout.')
      setActionLoading(false)
    }
  }

  const gerenciar = async () => {
    setActionLoading(true)
    try {
      const { portalUrl } = await createPortalSession()
      window.location.href = portalUrl
    } catch (err) {
      toast.error(err.message || 'Não foi possível abrir o portal de pagamento.')
      setActionLoading(false)
    }
  }

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  const emTrial = assinatura?.status === 'TRIALING'
  const restantes = emTrial ? diasRestantes(assinatura.trialTerminaEm) : null
  const totalTrialDias = plano?.trialDays || 15
  const progressoPct = restantes != null
    ? Math.min(100, Math.max(0, ((totalTrialDias - restantes) / totalTrialDias) * 100))
    : 0

  return (
    <div className="assinatura-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Assinatura</strong>
          <span>Gerencie seu plano e forma de pagamento.</span>
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <>
            <Skeleton width="40%" height={16} />
            <Skeleton width="60%" height={30} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <div className="panel-header">
              <div>
                <h2>Plano mensal{plano && <> — {formatarMoeda(plano.valorMensal)}/mês</>}</h2>
                <p>Acesso completo ao sistema</p>
              </div>
              <span className={STATUS_CLASSES[assinatura.status] || 'plan-badge neutral'}>
                {STATUS_LABELS[assinatura.status] || assinatura.status}
              </span>
            </div>

            {emTrial && restantes != null && (
              <div className="trial-progress">
                <div className="trial-progress-top">
                  <span><CalendarClock size={15} /> {restantes === 0 ? 'Último dia de teste' : `Faltam ${restantes} ${restantes === 1 ? 'dia' : 'dias'} de teste`}</span>
                  <span className="trial-progress-total">{totalTrialDias} dias no total</span>
                </div>
                <div className="trial-progress-track">
                  <div className="trial-progress-fill" style={{ width: `${progressoPct}%` }} />
                </div>
                <p className="trial-reassurance-inline">
                  <ShieldCheck size={14} /> Nenhuma cobrança até {formatarData(assinatura.trialTerminaEm)}. Cancele antes disso e não paga nada{plano ? <> — depois, {formatarMoeda(plano.valorMensal)}/mês</> : null}.
                </p>
              </div>
            )}

            <div className="assinatura-detalhes">
              {assinatura.status === 'ATIVA' && assinatura.periodoAtualTerminaEm && (
                <div className="assinatura-detalhe"><Clock size={16} /><span>Próxima cobrança em {formatarData(assinatura.periodoAtualTerminaEm)}</span></div>
              )}
              {assinatura.status === 'INADIMPLENTE' && (
                <div className="assinatura-detalhe"><AlertTriangle size={16} /><span>Não conseguimos cobrar seu cartão. Atualize sua forma de pagamento.</span></div>
              )}
              {assinatura.status === 'CANCELADA' && (
                <div className="assinatura-detalhe"><XCircle size={16} /><span>Sua assinatura foi cancelada.</span></div>
              )}
            </div>

            <div className="assinatura-actions">
              {assinatura.status === 'SEM_ASSINATURA' ? (
                <button className="button button-dark small-button" onClick={assinar} disabled={actionLoading}>
                  <CreditCard size={16} /> {actionLoading ? 'Abrindo checkout...' : `Iniciar teste grátis de ${totalTrialDias} dias`}
                </button>
              ) : (
                <button className="button button-outline small-button" onClick={gerenciar} disabled={actionLoading}>
                  <CreditCard size={16} /> {actionLoading ? 'Abrindo portal...' : 'Gerenciar assinatura'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
