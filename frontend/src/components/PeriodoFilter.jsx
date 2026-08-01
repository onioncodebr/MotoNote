// Select de período (presets tipo hoje/ontem/semana/mês, ver utils/periodo)
// + os dois inputs de data início/fim quando o preset escolhido é
// "personalizado". Pensado pra ficar solto dentro de uma toolbar
// (div.flex), por isso os inputs de data não têm <label> visível — só
// aria-label/title, mesmo padrão já usado em AuditoriaView.jsx. Sem limite
// de data máxima de propósito: filtrar/agendar datas futuras é válido (ex:
// entrega ou vale programado pra daqui a 30 dias).
export function PeriodoFilter({
  periodos,
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(periodos).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      {value === 'personalizado' && (
        <>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            aria-label="Data início"
            title="Data início"
            required
          />
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
            aria-label="Data fim"
            title="Data fim"
            required
          />
        </>
      )}
    </>
  )
}
