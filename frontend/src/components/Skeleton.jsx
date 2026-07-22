// Blocos de shimmer reutilizáveis pra estados de carregamento. Ficam dentro
// dos painéis/tabelas de cada view (em vez de trocar a página inteira por
// "Carregando..."), então o toolbar/filtros continuam visíveis e clicáveis.
export function Skeleton({ width, height = 14, radius, className = '', style }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonRow({ cells = 3 }) {
  return (
    <div className="table-row skeleton-row">
      {Array.from({ length: cells }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? '65%' : '75%'} />
      ))}
    </div>
  )
}
