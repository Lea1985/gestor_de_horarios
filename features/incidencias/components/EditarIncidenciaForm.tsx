//features/incidencias/components/EditarIncidenciaForm.tsx
import type { Codigario, CodigarioItem } from "../types"
import type { FormData } from "../hooks/useEditarIncidencia"

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
function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}
function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}
// Este formulario ya no recibe `tieneReemplazo`: si la incidencia tiene
// un reemplazo activo, la página (editar/[id]/page.tsx) directamente no
// renderiza este componente -- muestra un bloqueo total en su lugar
// (ver UX-INC-001, 25/08/2026). Acá siempre se edita completo.
export function EditarIncidenciaForm({
  form,
  setForm,
  formErrors,
  codigarios,
  items,
  loadingItems,
  guardando,
  campo,
  onGuardar,
  onCancelar,
}: {
  form:           FormData
  setForm:        React.Dispatch<React.SetStateAction<FormData>>
  formErrors:     Partial<FormData>
  codigarios:     Codigario[]
  items:          CodigarioItem[]
  loadingItems:   boolean
  guardando:      boolean
  campo:          <K extends keyof FormData>(key: K, value: string) => void
  onGuardar:      () => void
  onCancelar:     () => void
}) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {/* Codigario */}
        <div>
          <label style={s.label}>
            Tipo de incidencia <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <select
            value={form.codigarioId}
            onChange={e => { campo("codigarioId", e.target.value); setForm(p => ({ ...p, codigarioItemId: "" })) }}
            style={{ ...s.input, ...(formErrors.codigarioId ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.codigarioId)}
          >
            <option value="">Seleccionar catálogo...</option>
            {codigarios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {formErrors.codigarioId && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.codigarioId}
            </span>
          )}
        </div>
        {/* Item */}
        <div>
          <label style={s.label}>
            Código <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <select
            value={form.codigarioItemId}
            onChange={e => campo("codigarioItemId", e.target.value)}
            disabled={!form.codigarioId || loadingItems}
            style={{
              ...s.input,
              ...(formErrors.codigarioItemId ? { borderColor: "var(--color-error)" } : {}),
              opacity: (!form.codigarioId || loadingItems) ? 0.5 : 1,
            }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.codigarioItemId)}
          >
            <option value="">
              {loadingItems
                ? "Cargando..."
                : !form.codigarioId
                  ? "Primero seleccioná un catálogo"
                  : "Seleccionar código..."
              }
            </option>
            {items.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>)}
          </select>
          {formErrors.codigarioItemId && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.codigarioItemId}
            </span>
          )}
        </div>
        {/* Fecha desde */}
        <div>
          <label style={s.label}>
            Fecha desde <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            type="date"
            value={form.fecha_desde}
            onChange={e => campo("fecha_desde", e.target.value)}
            style={{ ...s.input, ...(formErrors.fecha_desde ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.fecha_desde)}
          />
          {formErrors.fecha_desde && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.fecha_desde}
            </span>
          )}
        </div>
        {/* Fecha hasta */}
        <div>
          <label style={s.label}>
            Fecha hasta <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            type="date"
            value={form.fecha_hasta}
            onChange={e => campo("fecha_hasta", e.target.value)}
            style={{ ...s.input, ...(formErrors.fecha_hasta ? { borderColor: "var(--color-error)" } : {}) }}
            onFocus={focusStyle}
            onBlur={blurStyle(!!formErrors.fecha_hasta)}
          />
          {formErrors.fecha_hasta && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
              {formErrors.fecha_hasta}
            </span>
          )}
        </div>
        {/* Observación */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={s.label}>
            Observación <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            value={form.observacion}
            onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
            rows={3}
            style={{ ...s.input, resize: "vertical" }}
            onFocus={focusStyle}
            onBlur={blurStyle(false)}
            placeholder="Ej: Certificado médico presentado"
          />
        </div>
      </div>
      {/* Acciones */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
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
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}