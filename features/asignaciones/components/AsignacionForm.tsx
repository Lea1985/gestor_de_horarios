// features/asignaciones/components/AsignacionForm.tsx

import type { Agente, Unidad, Materia, Comision, Turno, AsignacionFormData } from "../types"

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
  inputDisabled: {
    width:        "100%",
    background:   "var(--color-surface-raised)",
    border:       "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding:      "8px 12px",
    fontSize:     "var(--text-sm)",
    color:        "var(--color-text-hint)",
    outline:      "none",
    cursor:       "not-allowed" as const,
    opacity:      0.6,
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
  form:                  AsignacionFormData
  editando:              number | null
  tieneHistorial:        boolean
  loadingCombos:         boolean
  guardando:             boolean
  agentes:               Agente[]
  unidades:              Unidad[]
  materias:              Materia[]
  comisiones:            Comision[]
  turnos:                Turno[]
  comisionesDeUnidad:    Comision[]
  materiasFiltradas:     Materia[]
  unidadTieneComisiones: boolean
  onCampo:               <K extends keyof AsignacionFormData>(key: K, value: string) => void
  onUnidadChange:        (v: string) => void
  onComisionChange:      (v: string) => void
  onGuardar:             () => void
  onCancelar:            () => void
}

export function AsignacionForm({
  form, editando, tieneHistorial, loadingCombos, guardando,
  agentes, unidades, materias, comisiones, turnos,
  comisionesDeUnidad, materiasFiltradas, unidadTieneComisiones,
  onCampo, onUnidadChange, onComisionChange, onGuardar, onCancelar,
}: Props) {

  // Campos estructurales bloqueados cuando hay historial en edición
  const bloqueado = editando !== null && tieneHistorial

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 560 }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: bloqueado ? "var(--space-2)" : "var(--space-6)" }}>
        {editando ? "Editar asignación" : "Nueva asignación"}
      </h2>

      {/* Aviso de edición restringida */}
      {bloqueado && (
        <div style={{ marginBottom: "var(--space-4)", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          Los campos estructurales están bloqueados porque esta asignación tiene historial (distribuciones, incidencias o clases programadas). Solo podés modificar fecha fin y estado.
        </div>
      )}

      {loadingCombos ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>Cargando opciones...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Agente — solo en creación */}
          {!editando && (
            <div>
              <label style={s.label}>
                Agente <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional — vacante si no se selecciona)</span>
              </label>
              <select value={form.agenteId} onChange={e => onCampo("agenteId", e.target.value)} style={s.input} onFocus={focusStyle} onBlur={blurStyle}>
                <option value="">Seleccionar agente...</option>
                {agentes.map(a => <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Unidad */}
          <div>
            <label style={s.label}>Unidad <span style={{ color: "var(--color-error)" }}>*</span></label>
            <select
              value={form.unidadId}
              onChange={e => !bloqueado && onUnidadChange(e.target.value)}
              style={bloqueado ? s.inputDisabled : s.input}
              disabled={bloqueado}
              onFocus={!bloqueado ? focusStyle : undefined}
              onBlur={!bloqueado ? blurStyle : undefined}
            >
              <option value="">Seleccionar unidad...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>

          {/* Identificador */}
          <div>
            <label style={s.label}>Identificador <span style={{ color: "var(--color-error)" }}>*</span></label>
            <input
              value={form.identificadorEstructural}
              onChange={e => !bloqueado && onCampo("identificadorEstructural", e.target.value)}
              placeholder="Ej: DOC-1A-LENGUA"
              style={bloqueado ? s.inputDisabled : s.input}
              disabled={bloqueado}
              onFocus={!bloqueado ? focusStyle : undefined}
              onBlur={!bloqueado ? blurStyle : undefined}
            />
          </div>

          {/* Fechas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={s.label}>Fecha inicio <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={e => !bloqueado && onCampo("fecha_inicio", e.target.value)}
                style={bloqueado ? s.inputDisabled : s.input}
                disabled={bloqueado}
                onFocus={!bloqueado ? focusStyle : undefined}
                onBlur={!bloqueado ? blurStyle : undefined}
              />
            </div>
            <div>
              <label style={s.label}>Fecha fin <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={e => onCampo("fecha_fin", e.target.value)}
                style={s.input}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Comisión + Materia o Turno */}
          {unidadTieneComisiones ? (
            <>
              <div>
                <label style={s.label}>Comisión</label>
                <select
                  value={form.comisionId}
                  onChange={e => !bloqueado && onComisionChange(e.target.value)}
                  style={bloqueado ? s.inputDisabled : s.input}
                  disabled={bloqueado}
                  onFocus={!bloqueado ? focusStyle : undefined}
                  onBlur={!bloqueado ? blurStyle : undefined}
                >
                  <option value="">Seleccionar comisión...</option>
                  {comisionesDeUnidad.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Materia</label>
                <select
                  value={form.materiaId}
                  onChange={e => !bloqueado && onCampo("materiaId", e.target.value)}
                  style={{ ...(bloqueado ? s.inputDisabled : s.input), opacity: (!form.cursoId || bloqueado) ? 0.5 : 1 }}
                  disabled={!form.cursoId || bloqueado}
                  onFocus={!bloqueado ? focusStyle : undefined}
                  onBlur={!bloqueado ? blurStyle : undefined}
                >
                  <option value="">{!form.cursoId ? "Primero seleccioná una comisión" : "Seleccionar materia..."}</option>
                  {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label style={s.label}>Turno <span style={{ color: "var(--color-error)" }}>*</span></label>
              <select
                value={form.turnoId}
                onChange={e => !bloqueado && onCampo("turnoId", e.target.value)}
                style={bloqueado ? s.inputDisabled : s.input}
                disabled={bloqueado}
                onFocus={!bloqueado ? focusStyle : undefined}
                onBlur={!bloqueado ? blurStyle : undefined}
              >
                <option value="">Seleccionar turno...</option>
                {turnos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          )}

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
              disabled={guardando}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear asignación"}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
