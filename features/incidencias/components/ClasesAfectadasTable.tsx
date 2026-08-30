// features/incidencias/components/ClasesAfectadasTable.tsx
import { useState } from "react"
import type { ClaseAfectada, ReemplazoClase } from "../types"
function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0")
  const m = (minutos % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}
function nombreSuplente(reemplazo: ReemplazoClase): string {
  if (reemplazo.agenteSuplente) {
    return `${reemplazo.agenteSuplente.apellido}, ${reemplazo.agenteSuplente.nombre}`
  }
  return "—"
}
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
const estadoBadge: Record<ClaseAfectada["estado"], { label: string; color: string; bg: string }> = {
  PROGRAMADA:  { label: "Programada",  color: "var(--color-text-secondary)", bg: "var(--color-surface-raised)" },
  DICTADA:     { label: "Dictada",     color: "var(--color-success-text)",   bg: "var(--color-success-bg)" },
  SUSPENDIDA:  { label: "Suspendida",  color: "var(--color-error)",          bg: "var(--color-error-bg)" },
  REEMPLAZADA: { label: "Reemplazada", color: "var(--color-accent)",         bg: "var(--color-accent-bg, #f0f8ff)" },
}
const UMBRAL_AUTO_COLAPSO = 5
export function ClasesAfectadasTable({
  clases,
  esRaiz,
  onAgregarReemplazo,
  onEliminarReemplazo,
  eliminandoReemplazoId,
  errorEliminarReemplazo,
}: {
  clases:                  ClaseAfectada[]
  esRaiz:                  boolean
  onAgregarReemplazo:      (clase: ClaseAfectada) => void
  onEliminarReemplazo:     (reemplazoId: number) => void
  eliminandoReemplazoId:   number | null
  errorEliminarReemplazo:  { reemplazoId: number; mensaje: string } | null
}) {
const hayPendientes = clases.some(
  c => c.estado === "PROGRAMADA" && c.reemplazos.every(r => !r.activo)
)
  // Colapsado por defecto si hay muchas clases, salvo que alguna esté sin cubrir.
  const [abierto, setAbierto] = useState(
    clases.length <= UMBRAL_AUTO_COLAPSO || hayPendientes
  )
  const puedeColapsar = clases.length > 0
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <button
        onClick={() => puedeColapsar && setAbierto(v => !v)}
        disabled={!puedeColapsar}
        style={{
          width: "100%", padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none",
          borderBottom: abierto ? "1px solid var(--color-border)" : "none",
          cursor: puedeColapsar ? "pointer" : "default", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
            Clases afectadas
          </span>
          {clases.length > 0 && (
            <span style={{ fontSize: "var(--text-2xs)", padding: "1px 8px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
              {clases.length}
            </span>
          )}
        </span>
        {puedeColapsar && (
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: abierto ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", color: "var(--color-text-hint)", flexShrink: 0 }}
          >
            <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {(!puedeColapsar || abierto) && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Fecha", "Módulo", "Estado", "Reemplazante", ""].map(col => (
                <th key={col} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clases.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                  No hay clases programadas en este rango
                </td>
              </tr>
            ) : clases.map(clase => {
              const badge          = estadoBadge[clase.estado]
              const reemplazoActivo = clase.reemplazos.find(r => r.activo) ?? null
              const estaEliminando = reemplazoActivo !== null && eliminandoReemplazoId === reemplazoActivo.id
              const errorFila = reemplazoActivo !== null && errorEliminarReemplazo?.reemplazoId === reemplazoActivo.id
                ? errorEliminarReemplazo.mensaje
                : null
              return (
                <tr
                  key={clase.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {clase.fecha?.slice(0, 10).split("-").reverse().join("/")}
                  </td>
                  <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                    {clase.modulo
                      ? `${clase.modulo.dia_semana} · ${formatHora(clase.modulo.hora_desde)}–${formatHora(clase.modulo.hora_hasta)}`
                      : "—"
                    }
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize:     "var(--text-xs)",
                      fontWeight:   "var(--font-medium)",
                      color:        badge.color,
                      background:   badge.bg,
                      padding:      "2px 8px",
                      borderRadius: "var(--radius-full)",
                      border:       "1px solid currentColor",
                      opacity:      0.9,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  {/* Reemplazante -- solo el activo, sin importar si la incidencia
                      es raíz o parte de una cadena. El historial completo (quién
                      más pasó por esta clase antes) se puede ver en la tabla
                      "Cadena de incidencias" de más abajo, que sí distingue cada
                      eslabón por separado -- mostrarlo acá también confundía,
                      porque mezclaba reemplazantes de OTRAS incidencias de la
                      misma cadena como si fueran de esta (hallazgo 18/08/2026). */}
                  <td style={td}>
                    {reemplazoActivo ? (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
                        {nombreSuplente(reemplazoActivo)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>Sin cubrir</span>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
                      {reemplazoActivo ? (
                        <>
                          <button
                            onClick={() => !estaEliminando && onEliminarReemplazo(reemplazoActivo.id)}
                            disabled={estaEliminando}
                            style={{
                              background: "none", border: "none",
                              fontSize:   "var(--text-xs)", fontWeight: "var(--font-medium)",
                              color:      "var(--color-error)",
                              cursor:     estaEliminando ? "not-allowed" : "pointer",
                              opacity:    estaEliminando ? 0.6 : 1,
                              padding:    0,
                            }}
                          >
                            {estaEliminando ? "Quitando..." : "Quitar"}
                          </button>
                          {errorFila && (
                            <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-error)" }}>
                              {errorFila}
                            </span>
                          )}
                        </>
                      ) : clase.estado === "SUSPENDIDA" ? (
                        // UX-REE-005: "+ Agregar" solo tiene sentido sobre una
                        // clase que quedó sin cubrir por la incidencia. Antes
                        // se ofrecía también en PROGRAMADA (no afectada) y
                        // DICTADA (ya pasó), donde no hay nada que reemplazar
                        // -- mismo criterio que ya usa PasoReemplazos.tsx al
                        // filtrar clases elegibles del wizard.
                        <button
                          onClick={() => onAgregarReemplazo(clase)}
                          style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                        >
                          + Agregar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}