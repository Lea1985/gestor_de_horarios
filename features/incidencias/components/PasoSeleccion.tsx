//features/incidencias/components/PasoSeleccion.tsx
import type { AsignacionParaIncidencia } from "../types"
import { nombreAgente } from "../hooks/useNuevaIncidencia"

const th = {
  textAlign:     "left" as const,
  fontSize:      "var(--text-2xs)",
  fontWeight:    "var(--font-medium)" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color:         "var(--color-text-secondary)",
  padding:       "10px 12px",
  borderBottom:  "1px solid var(--color-border-strong)",
  background:    "var(--color-surface-raised)",
}

const td = {
  padding:       "10px 12px",
  fontSize:      "var(--text-sm)",
  color:         "var(--color-text-primary)",
  borderBottom:  "1px solid var(--color-border)",
  verticalAlign: "middle" as const,
}

const inputStyle = {
  width:        "100%",
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding:      "8px 12px",
  fontSize:     "var(--text-sm)",
  color:        "var(--color-text-primary)",
  outline:      "none",
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

export function PasoSeleccion({
  asignacionesFiltradas,
  cursosUnicos,
  seleccionados,
  filtroTexto,
  filtroCurso,
  setFiltroTexto,
  setFiltroCurso,
  toggleSeleccion,
  toggleTodos,
  onContinuar,
}: {
  asignacionesFiltradas: AsignacionParaIncidencia[]
  cursosUnicos:          { id: number; nombre: string }[]
  seleccionados:         number[]
  filtroTexto:           string
  filtroCurso:           string
  setFiltroTexto:        (v: string) => void
  setFiltroCurso:        (v: string) => void
  toggleSeleccion:       (id: number) => void
  toggleTodos:           () => void
  onContinuar:           () => void
}) {
  const todosSeleccionados =
    asignacionesFiltradas.length > 0 &&
    asignacionesFiltradas.every(a => seleccionados.includes(a.id))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" as const }}>
        <input
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          placeholder="Buscar por agente, identificador o documento..."
          style={{ ...inputStyle, flex: "1 1 260px", minWidth: 200 }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        <select
          value={filtroCurso}
          onChange={e => setFiltroCurso(e.target.value)}
          style={{ ...inputStyle, flex: "0 1 200px" }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        >
          <option value="">Todos los cursos</option>
          {cursosUnicos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {seleccionados.length > 0 && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", fontWeight: "var(--font-medium)" }}>
          {seleccionados.length} asignación{seleccionados.length !== 1 ? "es" : ""} seleccionada{seleccionados.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Tabla */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 40 }}>
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={toggleTodos}
                  style={{ cursor: "pointer" }}
                />
              </th>
              {["Agente", "Identificador", "Unidad", "Curso / Comisión"].map(col => (
                <th key={col} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {asignacionesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                  Sin resultados
                </td>
              </tr>
            ) : asignacionesFiltradas.map(a => {
              const seleccionado = seleccionados.includes(a.id)
              const agente       = a.titularidades[0]?.agente
              return (
                <tr
                  key={a.id}
                  onClick={() => toggleSeleccion(a.id)}
                  style={{
                    cursor:     "pointer",
                    transition: "background 0.1s",
                    background: seleccionado ? "var(--color-accent-bg, #f0f8ff)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!seleccionado) e.currentTarget.style.background = "var(--color-surface-raised)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = seleccionado ? "var(--color-accent-bg, #f0f8ff)" : "transparent" }}
                >
                  <td style={{ ...td, width: 40 }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleSeleccion(a.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={td}>
                    {nombreAgente(a)}
                    <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                      {agente?.documento ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {a.identificadorEstructural}
                  </td>
                  <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {a.unidad.nombre}
                  </td>
                  <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {[a.comision?.curso?.nombre, a.comision?.nombre].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onContinuar}
          disabled={seleccionados.length === 0}
          style={{
            padding:      "9px 20px",
            borderRadius: "var(--radius-lg)",
            border:       "none",
            background:   "var(--color-primary)",
            color:        "white",
            fontSize:     "var(--text-sm)",
            fontWeight:   "var(--font-medium)",
            cursor:       seleccionados.length === 0 ? "not-allowed" : "pointer",
            opacity:      seleccionados.length === 0 ? 0.4 : 1,
          }}
        >
          Continuar con {seleccionados.length || ""} seleccionada{seleccionados.length !== 1 ? "s" : ""} →
        </button>
      </div>

    </div>
  )
}