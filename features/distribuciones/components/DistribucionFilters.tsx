// features/distribuciones/components/DistribucionFilters.tsx

const s = {
  input: {
    width: "100%",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "8px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    outline: "none",
  },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

type Props = {
  filtroTexto:  string
  filtroCurso:  string
  filtroTurno:  string
  filtroEstado: string
  cursosUnicos: string[]
  turnosUnicos: string[]
  hayFiltros:   boolean
  onTexto:      (v: string) => void
  onCurso:      (v: string) => void
  onTurno:      (v: string) => void
  onEstado:     (v: string) => void
  onLimpiar:    () => void
}

export function DistribucionFilters({
  filtroTexto, filtroCurso, filtroTurno, filtroEstado,
  cursosUnicos, turnosUnicos, hayFiltros,
  onTexto, onCurso, onTurno, onEstado, onLimpiar,
}: Props) {
  return (
    <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>

      <div style={{ flex: "1 1 220px", minWidth: 180 }}>
        <input
          value={filtroTexto}
          onChange={e => onTexto(e.target.value)}
          placeholder="Buscar por identificador o agente..."
          style={s.input}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </div>

      {cursosUnicos.length > 0 && (
        <div style={{ flex: "0 1 180px" }}>
          <select
            value={filtroCurso}
            onChange={e => onCurso(e.target.value)}
            style={s.input}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="">Todos los cursos</option>
            {cursosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {turnosUnicos.length > 0 && (
        <div style={{ flex: "0 1 160px" }}>
          <select
            value={filtroTurno}
            onChange={e => onTurno(e.target.value)}
            style={s.input}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="">Todos los turnos</option>
            {turnosUnicos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      <div style={{ flex: "0 1 140px" }}>
        <select
          value={filtroEstado}
          onChange={e => onEstado(e.target.value)}
          style={s.input}
          onFocus={focusStyle}
          onBlur={blurStyle}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      {hayFiltros && (
        <button
          onClick={onLimpiar}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-strong)",
            background: "transparent",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-medium)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Limpiar filtros
        </button>
      )}

    </div>
  )
}