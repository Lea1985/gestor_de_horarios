// features/asignaciones/components/CambiarTitularForm.tsx

import type { Agente, AsignacionFormData } from "../types"

const s = {
  label: {
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-medium)" as const,
    color:        "var(--color-text-primary)",
    display:      "block" as const,
    marginBottom: "var(--space-1)",
  },
  input: {
    width:        "100%",
    background:   "var(--color-surface)",
    border:       "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding:      "8px 12px",
    fontSize:     "var(--text-sm)",
    color:        "var(--color-text-primary)",
    outline:      "none",
  },
}

function focusStyle(e: React.FocusEvent<HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

type Props = {
  form:       AsignacionFormData
  agentes:    Agente[]
  guardando:  boolean
  onCampo:    <K extends keyof AsignacionFormData>(key: K, value: string) => void
  onGuardar:  () => void
  onCancelar: () => void
}

export function CambiarTitularForm({ form, agentes, guardando, onCampo, onGuardar, onCancelar }: Props) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 400 }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
        Cambiar titular
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <label style={s.label}>
            Nuevo titular <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <select
            value={form.agenteId}
            onChange={e => onCampo("agenteId", e.target.value)}
            style={s.input}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="">Seleccionar agente...</option>
            {agentes.map(a => (
              <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}