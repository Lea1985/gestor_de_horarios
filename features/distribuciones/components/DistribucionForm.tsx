// features/distribuciones/components/DistribucionForm.tsx

import type { Asignacion, DistribucionFormData } from "../types"

const s = {
  label: {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)",
    display: "block" as const,
    marginBottom: "var(--space-1)",
  },
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

function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}

type Props = {
  form:           DistribucionFormData
  formErrors:     Partial<DistribucionFormData>
  asignaciones:   Asignacion[]
  proximaVersion: number
  guardando:      boolean
  onCampo:        <K extends keyof DistribucionFormData>(key: K, value: string) => void
  onCrear:        () => void
  onCancelar:     () => void
}

export function DistribucionForm({
  form, formErrors, asignaciones, proximaVersion, guardando,
  onCampo, onCrear, onCancelar,
}: Props) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-6)",
      maxWidth: 560,
    }}>
      <h2 style={{
        fontSize: "var(--text-base)",
        fontWeight: "var(--font-medium)",
        color: "var(--color-text-primary)",
        marginBottom: "var(--space-6)",
      }}>
        Nueva distribución
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={s.label}>
            Asignación <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <select
            value={form.asignacionId}
            onChange={e => onCampo("asignacionId", e.target.value)}
            style={{ ...s.input, ...(formErrors.asignacionId ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.asignacionId)}
          >
            <option value="">Seleccionar asignación...</option>
            {asignaciones
              .sort((a, b) => a.identificadorEstructural.localeCompare(b.identificadorEstructural))
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.identificadorEstructural} — {a.titularidades?.[0]?.agente?.apellido}, {a.titularidades?.[0]?.agente?.nombre}
                  {a.curso ? ` (${a.curso.nombre})` : ""}
                </option>
              ))}
          </select>
          {formErrors.asignacionId && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.asignacionId}
            </span>
          )}
        </div>

        {form.asignacionId && (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
              padding: "6px 10px",
              background: "var(--color-surface-raised)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}>
              Se creará la <strong>versión {proximaVersion}</strong>
              {proximaVersion > 1
                ? ` (la asignación ya tiene ${proximaVersion - 1} versión${proximaVersion - 1 !== 1 ? "es" : ""})`
                : " (primera versión)"}
            </p>
          </div>
        )}

        <div>
          <label style={s.label}>
            Vigencia desde <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            type="date"
            value={form.fecha_vigencia_desde}
            onChange={e => onCampo("fecha_vigencia_desde", e.target.value)}
            style={{ ...s.input, ...(formErrors.fecha_vigencia_desde ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.fecha_vigencia_desde)}
          />
          {formErrors.fecha_vigencia_desde && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.fecha_vigencia_desde}
            </span>
          )}
        </div>

        <div>
          <label style={s.label}>
            Vigencia hasta{" "}
            <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            type="date"
            value={form.fecha_vigencia_hasta}
            onChange={e => onCampo("fecha_vigencia_hasta", e.target.value)}
            style={s.input}
            onFocus={focusStyle}
            onBlur={blurStyle(false)}
          />
        </div>

      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
        <button
          onClick={onCancelar}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-strong)",
            background: "transparent",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onCrear}
          disabled={guardando}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-lg)",
            border: "none",
            background: "var(--color-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            color: "white",
            cursor: guardando ? "not-allowed" : "pointer",
            opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardando ? "Creando..." : "Crear distribución"}
        </button>
      </div>

    </div>
  )
}