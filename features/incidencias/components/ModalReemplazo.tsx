// features/incidencias/components/ModalReemplazo.tsx
import type { ClaseAfectada, AgenteParaReemplazo } from "../types"

function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0")
  const m = (minutos % 60).toString().padStart(2, "0")
  return `${h}:${m}`
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

const labelStyle = {
  fontSize:     "var(--text-xs)",
  fontWeight:   "var(--font-medium)" as const,
  color:        "var(--color-text-primary)",
  display:      "block" as const,
  marginBottom: "var(--space-1)",
}

export function ModalReemplazo({
  clase,
  agentes,
  agenteId,
  setAgenteId,
  observacion,
  setObservacion,
  guardando,
  error,
  onConfirmar,
  onCancelar,
}: {
  clase:            ClaseAfectada
  agentes:          AgenteParaReemplazo[]
  agenteId:         string
  setAgenteId:      (v: string) => void
  observacion:      string
  setObservacion:   (v: string) => void
  guardando:        boolean
  error:            string | null
  onConfirmar:      () => void
  onCancelar:       () => void
}) {
  const fechaStr  = clase.fecha?.slice(0, 10)
  const moduloStr = clase.modulo
    ? `${clase.modulo.dia_semana} · ${formatHora(clase.modulo.hora_desde)}–${formatHora(clase.modulo.hora_hasta)}`
    : "Sin módulo"

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
            Agregar reemplazo
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {fechaStr} — {moduloStr}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        {/* Selector de agente suplente */}
        <div>
          <label style={labelStyle}>
            Agente suplente <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <select
            value={agenteId}
            onChange={e => setAgenteId(e.target.value)}
            style={{ ...inputStyle, ...(error && !agenteId ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
            onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
          >
            <option value="">Seleccionar agente...</option>
            {agentes.map(a => (
              <option key={a.id} value={a.id}>
                {a.apellido}, {a.nombre} — {a.documento}
              </option>
            ))}
          </select>
        </div>

        {/* Observación */}
        <div>
          <label style={labelStyle}>
            Observación <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            rows={2}
            placeholder="Ej: Cubre los módulos de la mañana"
            style={{ ...inputStyle, resize: "vertical" }}
            onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
            onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Confirmar"}
          </button>
        </div>

      </div>
    </div>
  )
}