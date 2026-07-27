// Blocos de shimmer reutilizáveis pra estados de carregamento. Ficam dentro
// dos painéis/tabelas de cada view (em vez de trocar a página inteira por
// "Carregando..."), então o toolbar/filtros continuam visíveis e clicáveis.
export function Skeleton({ width, height = 14, radius, className = '', style }) {
  return (
    <span
      className={`inline-block align-middle rounded-[var(--radius-sm)] bg-[linear-gradient(90deg,var(--dash-muted-bg)_25%,var(--dash-border-soft)_50%,var(--dash-muted-bg)_75%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_1.4s_ease_infinite] ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function SkeletonRow({ cells = 3 }) {
  return (
    <div className="table-row pointer-events-none">
      {Array.from({ length: cells }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? '65%' : '75%'} />
      ))}
    </div>
  )
}
