// features/asignaciones/components/EditarAsignacionForm.tsx

import type { EditarFormData } from "../hooks/useEditarAsignacion"

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

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

type Unidad   = { id: number; nombre: string }
type Comision = { id: number; nombre: string; turno: { id: number }; unidad: { id: number } | null }
type Materia  = { id: number; nombre: string; cursoId: number | null }
type Turno    = { id: number; nombre: string }

type Props = {
  form:               EditarFormData
  restringido:        boolean
  saving:             boolean
  unidades:           Unidad[]
  comisiones:         Comision[]
  materiasFiltradas:  Materia[]
  turnos:             Turno[]
  onField:            (key: keyof EditarFormData, value: string) => void
  onGuardar:          () => void
  onCancelar:         () => void
}

export function EditarAsignacionForm({
  form, restringido, saving,
  unidades, comisiones, materiasFiltradas, turnos,
  onField, onGuardar, onCancelar,
}: Props) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 560 }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
        Editar asignación
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

        {/* Banner restringido */}
        {restringido && (
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-warning-bg, #fefce8)", border: "1px solid var(--color-warning, #ca8a04)", fontSize: "var(--text-xs)", color: "var(--color-warning-text, #854d0e)" }}>
            Esta asignación tiene historial. Solo se puede modificar la fecha de cese.
            Para cambiar el titular, usá la opción "Cambio titular" desde la lista.
          </div>
        )}

        {/* Campos estructurales — solo sin historial */}
        {!restringido && (
          <>
            <div>
              <label style={s.label}>Unidad</label>
              <select value={form.unidadId} onChange={e => onField("unidadId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Seleccionar unidad...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Identificador</label>
              <input
                value={form.identificadorEstructural}
                onChange={e => onField("identificadorEstructural", e.target.value)}
                placeholder="Ej: DOC-1A-LENGUA"
                style={s.input}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            <div>
              <label style={s.label}>Fecha inicio</label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={e => onField("fecha_inicio", e.target.value)}
                style={s.input}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            <div>
              <label style={s.label}>Comisión</label>
              <select value={form.comisionId} onChange={e => onField("comisionId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Seleccionar comisión...</option>
                {comisiones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Materia</label>
              <select
                value={form.materiaId}
                onChange={e => onField("materiaId", e.target.value)}
                style={{ ...s.input, opacity: !form.cursoId ? 0.5 : 1 }}
                disabled={!form.cursoId}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">{!form.cursoId ? "Primero seleccioná una comisión" : "Seleccionar materia..."}</option>
                {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Turno</label>
              <select value={form.turnoId} onChange={e => onField("turnoId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Seleccionar turno...</option>
                {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Fecha fin — siempre editable */}
        <div>
          <label style={s.label}>
            Fecha de cese{" "}
            <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            type="date"
            value={form.fecha_fin}
            onChange={e => onField("fecha_fin", e.target.value)}
            style={s.input}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={saving}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  )
}