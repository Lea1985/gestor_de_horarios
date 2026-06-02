// features/incidencias/components/PasoFormulario.tsx
import type { Codigario, CodigarioItem, DatosComunes, AsignacionParaIncidencia } from "../types"
import { nombreAgente } from "../hooks/useNuevaIncidencia"

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

export function PasoFormulario({
  asignacionesLote,
  codigarios,
  items,
  loadingItems,
  datos,
  datosErr,
  guardando,
  setDatos,
  setDatosErr,
  onVolver,
  onGuardar,
}: {
  asignacionesLote: AsignacionParaIncidencia[]
  codigarios:       Codigario[]
  items:            CodigarioItem[]
  loadingItems:     boolean
  datos:            DatosComunes
  datosErr:         Partial<DatosComunes>
  guardando:        boolean
  setDatos:         React.Dispatch<React.SetStateAction<DatosComunes>>
  setDatosErr:      React.Dispatch<React.SetStateAction<Partial<DatosComunes>>>
  onVolver:         () => void
  onGuardar:        () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* Resumen lote */}
      <div style={{
        background:   "var(--color-surface-raised)",
        border:       "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding:      "var(--space-4)",
      }}>
        <p style={{
          fontSize:     "var(--text-xs)",
          fontWeight:   "var(--font-medium)",
          color:        "var(--color-text-secondary)",
          marginBottom: "var(--space-2)",
        }}>
          LOTE — {asignacionesLote.length} asignación{asignacionesLote.length !== 1 ? "es" : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--space-2)" }}>
          {asignacionesLote.map(a => (
            <span key={a.id} style={{
              fontSize:     "var(--text-xs)",
              padding:      "3px 8px",
              borderRadius: "var(--radius-sm)",
              background:   "var(--color-surface)",
              border:       "1px solid var(--color-border)",
              color:        "var(--color-text-primary)",
            }}>
              {nombreAgente(a)}
            </span>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div style={{
        background:   "var(--color-surface)",
        border:       "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding:      "var(--space-6)",
      }}>
        <h2 style={{
          fontSize:     "var(--text-base)",
          fontWeight:   "var(--font-medium)",
          color:        "var(--color-text-primary)",
          marginBottom: "var(--space-6)",
        }}>
          Datos de la incidencia
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

          {/* Catálogo */}
          <div>
            <label style={s.label}>
              Tipo de incidencia <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <select
              value={datos.codigarioId}
              onChange={e => {
                setDatos(p => ({ ...p, codigarioId: e.target.value }))
                setDatosErr(p => ({ ...p, codigarioId: undefined }))
              }}
              style={{ ...s.input, ...(datosErr.codigarioId ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle}
              onBlur={blurStyle(!!datosErr.codigarioId)}
            >
              <option value="">Seleccionar catálogo...</option>
              {codigarios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {datosErr.codigarioId && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                {datosErr.codigarioId}
              </span>
            )}
          </div>

          {/* Código */}
          <div>
            <label style={s.label}>
              Código <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <select
              value={datos.codigarioItemId}
              onChange={e => {
                setDatos(p => ({ ...p, codigarioItemId: e.target.value }))
                setDatosErr(p => ({ ...p, codigarioItemId: undefined }))
              }}
              disabled={!datos.codigarioId || loadingItems}
              style={{
                ...s.input,
                ...(datosErr.codigarioItemId ? { borderColor: "var(--color-error)" } : {}),
                opacity: (!datos.codigarioId || loadingItems) ? 0.5 : 1,
              }}
              onFocus={focusStyle}
              onBlur={blurStyle(!!datosErr.codigarioItemId)}
            >
              <option value="">
                {loadingItems
                  ? "Cargando..."
                  : !datos.codigarioId
                    ? "Primero seleccioná un catálogo"
                    : "Seleccionar código..."}
              </option>
              {items.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>)}
            </select>
            {datosErr.codigarioItemId && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                {datosErr.codigarioItemId}
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
              value={datos.fecha_desde}
              onChange={e => {
                setDatos(p => ({ ...p, fecha_desde: e.target.value }))
                setDatosErr(p => ({ ...p, fecha_desde: undefined }))
              }}
              style={{ ...s.input, ...(datosErr.fecha_desde ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle}
              onBlur={blurStyle(!!datosErr.fecha_desde)}
            />
            {datosErr.fecha_desde && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                {datosErr.fecha_desde}
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
              value={datos.fecha_hasta}
              onChange={e => {
                setDatos(p => ({ ...p, fecha_hasta: e.target.value }))
                setDatosErr(p => ({ ...p, fecha_hasta: undefined }))
              }}
              style={{ ...s.input, ...(datosErr.fecha_hasta ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle}
              onBlur={blurStyle(!!datosErr.fecha_hasta)}
            />
            {datosErr.fecha_hasta && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                {datosErr.fecha_hasta}
              </span>
            )}
          </div>

          {/* Observación */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={s.label}>
              Observación{" "}
              <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={datos.observacion}
              onChange={e => setDatos(p => ({ ...p, observacion: e.target.value }))}
              rows={3}
              style={{ ...s.input, resize: "vertical" }}
              onFocus={focusStyle}
              onBlur={blurStyle(false)}
              placeholder="Ej: Certificado médico presentado"
            />
          </div>

        </div>

        {/* Acciones */}
        <div style={{
          display:         "flex",
          gap:             "var(--space-3)",
          marginTop:       "var(--space-6)",
          justifyContent:  "space-between",
          alignItems:      "center",
        }}>
          <button
            onClick={onVolver}
            style={{
              padding:      "8px 16px",
              borderRadius: "var(--radius-lg)",
              border:       "1px solid var(--color-border-strong)",
              background:   "transparent",
              fontSize:     "var(--text-sm)",
              fontWeight:   "var(--font-medium)",
              color:        "var(--color-text-primary)",
              cursor:       "pointer",
            }}
          >
            ← Revisar lote
          </button>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
            <button
              onClick={onGuardar}
              disabled={guardando}
              style={{
                padding:      "9px 20px",
                borderRadius: "var(--radius-lg)",
                border:       "none",
                background:   "var(--color-primary)",
                color:        "white",
                fontSize:     "var(--text-sm)",
                fontWeight:   "var(--font-medium)",
                cursor:       guardando ? "not-allowed" : "pointer",
                opacity:      guardando ? 0.6 : 1,
              }}
            >
              {guardando
                ? `Creando ${asignacionesLote.length} incidencia${asignacionesLote.length !== 1 ? "s" : ""}...`
                : `Crear ${asignacionesLote.length} incidencia${asignacionesLote.length !== 1 ? "s" : ""} →`
              }
            </button>
            {!guardando && (
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                Luego podrás asignar reemplazos
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
