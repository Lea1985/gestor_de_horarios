// features/incidencias/components/PasoReemplazos.tsx
import type { ClaseParaReemplazo, ReemplazoConfig } from "../hooks/useNuevaIncidencia"
import { formatearFecha, formatearModulo } from "../hooks/useNuevaIncidencia"
import type { ResultadoCarga } from "../types"
// ── Tipos ─────────────────────────────────────────────────────
type Agente = { id: number; nombre: string; apellido: string }
// ── Estilos base ──────────────────────────────────────────────
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
const selectStyle = {
  width:        "100%",
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding:      "6px 10px",
  fontSize:     "var(--text-xs)",
  color:        "var(--color-text-primary)",
  outline:      "none",
}
// ── Sub-componente: grupo por asignación ──────────────────────
function GrupoAsignacion({
  agente,
  identificador,
  clases,
  clasesSeleccionadas,
  reemplazos,
  agentes,
  onToggleClase,
  onSetSuplente,
}: {
  agente:             string
  identificador:      string
  clases:             ClaseParaReemplazo[]
  clasesSeleccionadas: Set<number>
  reemplazos:         Map<number, ReemplazoConfig>
  agentes:            Agente[]
  onToggleClase:      (id: number) => void
  onSetSuplente:      (claseId: number, agenteId: number | null) => void
}) {
  // Elegibles para reemplazo = clases que la incidencia ya suspendió.
  // A esta altura del flujo nunca están en PROGRAMADA (ese era el bug).
  const elegibles           = clases.filter(c => c.estado === "SUSPENDIDA")
  const todasSeleccionadas  = elegibles.length > 0 &&
    elegibles.every(c => clasesSeleccionadas.has(c.id))
  function toggleGrupo() {
    if (todasSeleccionadas) {
      elegibles.forEach(c => {
        if (clasesSeleccionadas.has(c.id)) onToggleClase(c.id)
      })
    } else {
      elegibles.forEach(c => {
        if (!clasesSeleccionadas.has(c.id)) onToggleClase(c.id)
      })
    }
  }
  return (
    <div style={{
      background:   "var(--color-surface)",
      border:       "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      overflow:     "hidden",
    }}>
      {/* Header del grupo */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "var(--space-3)",
        padding:        "10px 14px",
        background:     "var(--color-surface-raised)",
        borderBottom:   "1px solid var(--color-border-strong)",
      }}>
        <input
          type="checkbox"
          checked={todasSeleccionadas}
          onChange={toggleGrupo}
          disabled={elegibles.length === 0}
          style={{ cursor: elegibles.length > 0 ? "pointer" : "not-allowed" }}
          title="Seleccionar todas las clases de este agente"
        />
        <div>
          <span style={{
            fontSize:   "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            color:      "var(--color-text-primary)",
          }}>
            {agente}
          </span>
          <span style={{
            fontSize:    "var(--text-xs)",
            color:       "var(--color-text-hint)",
            fontFamily:  "var(--font-mono)",
            marginLeft:  "var(--space-2)",
          }}>
            {identificador}
          </span>
        </div>
        <span style={{
          marginLeft:   "auto",
          fontSize:     "var(--text-xs)",
          color:        "var(--color-text-hint)",
        }}>
          {clases.length} clase{clases.length !== 1 ? "s" : ""}
        </span>
      </div>
      {/* Tabla de clases */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 40 }} />
            <th style={th}>Fecha</th>
            <th style={th}>Módulo</th>
            <th style={th}>Estado</th>
            <th style={th}>Suplente</th>
          </tr>
        </thead>
        <tbody>
          {clases.map(clase => {
            const esElegible    = clase.estado === "SUSPENDIDA"
            const seleccionada  = clasesSeleccionadas.has(clase.id)
            const config        = reemplazos.get(clase.id)
            const faltaSuplente = seleccionada && (!config || config.agenteSuplenteId === null)
            return (
              <tr
                key={clase.id}
                style={{
                  background: !esElegible
                    ? "var(--color-surface-raised)"
                    : seleccionada
                      ? "var(--color-accent-bg, rgba(30,155,184,0.06))"
                      : "transparent",
                  opacity: !esElegible ? 0.5 : 1,
                  transition: "background 0.1s",
                }}
              >
                {/* Checkbox */}
                <td style={{ ...td, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    disabled={!esElegible}
                    onChange={() => onToggleClase(clase.id)}
                    style={{ cursor: esElegible ? "pointer" : "not-allowed" }}
                  />
                </td>
                {/* Fecha */}
                <td style={{ ...td, whiteSpace: "nowrap" as const }}>
                  {formatearFecha(clase.fecha)}
                </td>
                {/* Módulo */}
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {formatearModulo(clase)}
                </td>
                {/* Estado */}
                <td style={td}>
                  {clase.estado === "SUSPENDIDA" ? (
                    <span style={{
                      fontSize:     "var(--text-2xs)",
                      fontWeight:   "var(--font-medium)",
                      padding:      "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      background:   "var(--color-warning-bg, #fff7ed)",
                      color:        "var(--color-warning-text, #c2610c)",
                    }}>
                      Suspendida
                    </span>
                  ) : (
                    <span style={{
                      fontSize:     "var(--text-2xs)",
                      fontWeight:   "var(--font-medium)",
                      padding:      "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      background:   "var(--color-surface-raised)",
                      color:        "var(--color-text-secondary)",
                      border:       "1px solid var(--color-border)",
                    }}>
                      {clase.estado}
                    </span>
                  )}
                </td>
                {/* Selector suplente */}
                <td style={{ ...td, minWidth: 180 }}>
                  {esElegible && seleccionada ? (
                    <div>
                      <select
                        value={config?.agenteSuplenteId ?? ""}
                        onChange={e => onSetSuplente(
                          clase.id,
                          e.target.value ? Number(e.target.value) : null
                        )}
                        style={{
                          ...selectStyle,
                          borderColor: faltaSuplente
                            ? "var(--color-error)"
                            : "var(--color-border)",
                        }}
                      >
                        <option value="">— Elegir suplente —</option>
                        {agentes.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.apellido}, {a.nombre}
                          </option>
                        ))}
                      </select>
                      {faltaSuplente && (
                        <span style={{
                          fontSize:  "var(--text-2xs)",
                          color:     "var(--color-error)",
                          marginTop: "2px",
                          display:   "block",
                        }}>
                          Requerido
                        </span>
                      )}
                    </div>
                  ) : esElegible ? (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                      Sin reemplazo
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
// ── Componente principal ──────────────────────────────────────
export function PasoReemplazos({
  grupos,
  resultado,
  clasesSeleccionadas,
  reemplazos,
  agentes,
  suplenteGlobal,
  loadingClases,
  guardandoReemplazos,
  clasesConSuplenteIncompleto,
  onToggleClase,
  onToggleTodas,
  onSetSuplente,
  onSetSuplenteGlobal,
  onAplicarGlobal,
  onGuardar,
  onSaltar,
}: {
  grupos: {
    asignacionId:  number
    agente:        string
    identificador: string
    clases:        ClaseParaReemplazo[]
  }[]
  resultado:                   ResultadoCarga[] | null
  clasesSeleccionadas:        Set<number>
  reemplazos:                 Map<number, ReemplazoConfig>
  agentes:                    Agente[]
  suplenteGlobal:             number | null
  loadingClases:              boolean
  guardandoReemplazos:        boolean
  clasesConSuplenteIncompleto: number[]
  onToggleClase:              (id: number) => void
  onToggleTodas:              () => void
  onSetSuplente:              (claseId: number, agenteId: number | null) => void
  onSetSuplenteGlobal:        (id: number | null) => void
  onAplicarGlobal:            () => void
  onGuardar:                  () => void
  onSaltar:                   () => void
}) {
  // Total de clases elegibles (SUSPENDIDA por esta incidencia) — antes
  // filtraba por PROGRAMADA y siempre daba 0, aunque hubiera clases reales.
  const totalClases      = grupos.flatMap(g => g.clases).filter(c => c.estado === "SUSPENDIDA").length
  const seleccionadas    = clasesSeleccionadas.size
  const hayIncompletos   = clasesConSuplenteIncompleto.length > 0
  const haySeleccionadas = seleccionadas > 0
  // UX-INC-011: antes, cuando no había clases para mostrar (grupos vacío),
  // el mensaje afirmaba sin condición "Las incidencias fueron creadas
  // correctamente" -- aunque `resultado` tuviera entradas con ok:false
  // (algunas incidencias del lote habían fallado). Ahora se distingue.
  const huboFallosIncidencias = resultado?.some(r => !r.ok) ?? false
  if (loadingClases) {
    return (
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "var(--space-3)",
        padding:        "var(--space-12)",
        color:          "var(--color-text-hint)",
        fontSize:       "var(--text-sm)",
      }}>
        <div style={{
          width:        20,
          height:       20,
          borderRadius: "50%",
          border:       "2px solid var(--color-border)",
          borderTopColor: "var(--color-accent)",
          animation:    "spin 0.8s linear infinite",
        }} />
        Cargando clases de la incidencia...
      </div>
    )
  }
  if (grupos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div style={{
          padding:      "var(--space-8)",
          textAlign:    "center",
          background:   "var(--color-surface)",
          border:       "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
        }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            No se encontraron clases programadas en este rango de fechas.
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: huboFallosIncidencias ? "var(--color-error)" : "var(--color-text-hint)" }}>
            {huboFallosIncidencias
              ? "Ojo: alguna(s) incidencia(s) del lote no se pudieron crear -- revisá el resultado."
              : "Las incidencias fueron creadas correctamente."
            }
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onSaltar}
            style={{
              padding:      "9px 20px",
              borderRadius: "var(--radius-lg)",
              border:       "none",
              background:   "var(--color-primary)",
              color:        "white",
              fontSize:     "var(--text-sm)",
              fontWeight:   "var(--font-medium)",
              cursor:       "pointer",
            }}
          >
            Ver resultado →
          </button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Descripción y acción global */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        gap:            "var(--space-4)",
        flexWrap:       "wrap" as const,
      }}>
        <div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {totalClases} clase{totalClases !== 1 ? "s" : ""} suspendida{totalClases !== 1 ? "s" : ""} por esta incidencia.
            Seleccioná las que necesitan reemplazo y asigná un suplente.
          </p>
          {seleccionadas > 0 && (
            <p style={{
              fontSize:   "var(--text-xs)",
              color:      "var(--color-accent)",
              fontWeight: "var(--font-medium)",
              marginTop:  "var(--space-1)",
            }}>
              {seleccionadas} clase{seleccionadas !== 1 ? "s" : ""} con reemplazo asignado
            </p>
          )}
        </div>
        {/* Suplente global */}
        {agentes.length > 0 && haySeleccionadas && (
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "var(--space-2)",
            background:   "var(--color-surface)",
            border:       "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding:      "8px 12px",
            flexShrink:   0,
          }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" as const }}>
              Aplicar a todas:
            </span>
            <select
              value={suplenteGlobal ?? ""}
              onChange={e => onSetSuplenteGlobal(e.target.value ? Number(e.target.value) : null)}
              style={{ ...selectStyle, width: "auto", minWidth: 160 }}
            >
              <option value="">— Elegir suplente —</option>
              {agentes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={onAplicarGlobal}
              disabled={!suplenteGlobal}
              style={{
                padding:      "6px 12px",
                borderRadius: "var(--radius-md)",
                border:       "none",
                background:   suplenteGlobal ? "var(--color-accent)" : "var(--color-surface-raised)",
                color:        suplenteGlobal ? "white" : "var(--color-text-hint)",
                fontSize:     "var(--text-xs)",
                fontWeight:   "var(--font-medium)",
                cursor:       suplenteGlobal ? "pointer" : "not-allowed",
                whiteSpace:   "nowrap" as const,
              }}
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
      {/* Grupos por asignación */}
      {grupos.map(grupo => (
        <GrupoAsignacion
          key={grupo.asignacionId}
          agente={grupo.agente}
          identificador={grupo.identificador}
          clases={grupo.clases}
          clasesSeleccionadas={clasesSeleccionadas}
          reemplazos={reemplazos}
          agentes={agentes}
          onToggleClase={onToggleClase}
          onSetSuplente={onSetSuplente}
        />
      ))}
      {/* Aviso suplentes incompletos */}
      {hayIncompletos && haySeleccionadas && (
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "var(--space-2)",
          padding:      "10px 14px",
          borderRadius: "var(--radius-md)",
          background:   "var(--color-warning-bg, #fff7ed)",
          border:       "1px solid var(--color-warning, #f59e0b)",
          fontSize:     "var(--text-xs)",
          color:        "var(--color-warning-text, #c2610c)",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2L13 12H1L7 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M7 6v3M7 10.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {clasesConSuplenteIncompleto.length} clase{clasesConSuplenteIncompleto.length !== 1 ? "s" : ""} seleccionada{clasesConSuplenteIncompleto.length !== 1 ? "s" : ""} sin suplente asignado. Asigná un suplente o destildalas.
        </div>
      )}
      {/* Footer */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        paddingTop:     "var(--space-2)",
        gap:            "var(--space-3)",
      }}>
        {/* Saltar — acción secundaria pero visible */}
        <button
          onClick={onSaltar}
          style={{
            padding:      "8px 16px",
            borderRadius: "var(--radius-lg)",
            border:       "1px solid var(--color-border)",
            background:   "transparent",
            fontSize:     "var(--text-sm)",
            color:        "var(--color-text-secondary)",
            cursor:       "pointer",
          }}
        >
          Saltar este paso
        </button>
        {/* Confirmar reemplazos */}
        <button
          onClick={onGuardar}
          disabled={guardandoReemplazos || hayIncompletos || !haySeleccionadas}
          style={{
            padding:      "9px 20px",
            borderRadius: "var(--radius-lg)",
            border:       "none",
            background:   (!haySeleccionadas || hayIncompletos)
              ? "var(--color-surface-raised)"
              : "var(--color-primary)",
            color:        (!haySeleccionadas || hayIncompletos)
              ? "var(--color-text-hint)"
              : "white",
            fontSize:     "var(--text-sm)",
            fontWeight:   "var(--font-medium)",
            cursor:       (guardandoReemplazos || hayIncompletos || !haySeleccionadas)
              ? "not-allowed"
              : "pointer",
          }}
        >
          {guardandoReemplazos
            ? "Guardando reemplazos..."
            : !haySeleccionadas
              ? "Sin reemplazos seleccionados"
              : `Confirmar ${seleccionadas} reemplazo${seleccionadas !== 1 ? "s" : ""}`
          }
        </button>
      </div>
    </div>
  )
}