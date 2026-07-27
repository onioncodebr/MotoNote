// O ícone da cebola substitui o "M" de "MotoNote" (fica embutido no texto,
// não ao lado dele) — só no modo compacto (ícone sozinho, sem texto) é que
// ele aparece como imagem simples.
//
// Cor do texto usa var(--ink) fixo (pensado pra fundo claro da landing/
// login) mas troca pra var(--dash-text-strong) dentro do dashboard — a
// variante Tailwind arbitrária [.dashboard-shell_&] cobre isso sem precisar
// de uma prop de tom: dashboard e landing/login nunca aparecem ao mesmo
// tempo, então o ancestral já diz sozinho qual tom usar.
const BASE = 'flex items-center text-[length:1.125rem] leading-none tracking-[-0.5px] font-bold text-[var(--ink)] [.dashboard-shell_&]:text-[var(--dash-text-strong)]'

export function Logo({ compact = false, dark = false, subtitle = false }) {
  const src = dark ? '/icon.png' : '/icon-black.png'

  if (compact) {
    return (
      <div className={`${BASE} gap-1.5 text-[length:var(--fs-sm)]`}>
        <img className="w-5 h-5 rounded-[5px] flex-shrink-0 object-cover" src={src} alt="MotoNote" />
      </div>
    )
  }

  return (
    <div className={`${BASE} gap-[10px]`}>
      <span className={subtitle ? 'flex flex-col gap-[2px] leading-[1.1]' : ''}>
        {/* Tamanho relativo (em) pra acompanhar o font-size de cada contexto
            (sidebar, landing, etc.), com o corpo do ícone alinhado à altura
            do texto e o bico/broto da cebola sobrando um pouco acima da
            linha — igual um acento, é o efeito de logotipo buscado. */}
        <span className="whitespace-nowrap"><img className="inline w-[1.65em] h-[1.65em] align-[-0.42em] -mr-[0.2em] object-contain" src={src} alt="M" />oto<b className="font-normal">Note</b></span>
        {subtitle && (
          <small className="brand-subtitle font-normal text-[length:0.625rem] leading-none tracking-normal normal-case opacity-[.55]">
            Motoboy Annotation
          </small>
        )}
      </span>
    </div>
  )
}
