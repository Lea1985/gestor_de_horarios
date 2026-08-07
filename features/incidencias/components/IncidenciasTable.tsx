//features/incidencias/components/IncidenciasTable.tsx
import { useRouter } from "next/navigation"
import type { Incidencia } from "../types"


const th = {
  textAlign:     "left"      as const,
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

export function IncidenciasTable({ incidencias, verEliminadas, onEliminar, onReactivar }: {
  incidencias:   Incidencia[]
  verEliminadas: boolean
  onEliminar:    (id: number) => void
  onReactivar:   (id: number) => void | Promise<void>
}) {
  const router = useRouter()

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Agente", "Asignación", "Tipo", "Desde", "Hasta", "Cadena", ""].map(col => (
              <th key={col} style={th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidencias.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                No hay incidencias{!verEliminadas ? " activas" : ""} registradas
              </td>
            </tr>
          ) : incidencias.map(i => (
            <tr
              key={i.id}
              style={{ transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Agente */}
              <td style={td}>
                {(() => {
                  const agente = i.agenteMostrado      
                  if (!i.asignacion) return `#${i.asignacionId}`
                  if (!agente) return <em>Vacante</em>
                  return `${agente.apellido}, ${agente.nombre}`
                })()}
                {!i.activo && (
                  <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                    Eliminada
                  </span>
                )}
              </td>

              {/* Asignación */}
              <td style={td}>
                {i.asignacion ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {i.asignacion.identificadorEstructural}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
                      {i.asignacion.unidad.nombre}
                    </span>
                    {i.asignacion.comision ? (
                      <>
                        {i.asignacion.materia && (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)" }}>
                            {i.asignacion.materia.nombre}
                          </span>
                        )}
                        <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-secondary)" }}>
                          {i.asignacion.comision.nombre}
                          {" · "}
                          {i.asignacion.comision.turno.nombre}
                        </span>
                      </>
                    ) : (
                      i.asignacion.materia && (
                        <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-secondary)" }}>
                          {i.asignacion.materia.nombre}
                          {i.asignacion.turno && ` · ${i.asignacion.turno.nombre}`}
                        </span>
                      )
                    )}
                  </div>
                ) : "—"}
              </td>

              {/* Tipo */}
              <td style={td}>
                {i.codigarioItem
                  ? <span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{i.codigarioItem.codigo}</span>
                      {" "}{i.codigarioItem.nombre}
                    </span>
                  : "—"
                }
              </td>

              {/* Desde */}
              <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {i.fecha_desde?.slice(0, 10)}
              </td>

              {/* Hasta */}
              <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {i.fecha_hasta?.slice(0, 10)}
              </td>

              {/* Cadena */}
              <td style={td}>
                {i.padre || (i.hijos?.length ?? 0) > 0
                  ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>Sí</span>
                  : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>No</span>
                }
              </td>

              {/* Acciones */}
              <td style={td}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={() => router.push(`/protected/dashboard/incidencias/${i.id}`)}
                    style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                  >
                    Gestionar
                  </button>

                  {i.activo ? (
                    <button
                      onClick={() => onEliminar(i.id)}
                      style={{ background: "none", border: "none", fontSize: "var(--text-xs)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                    >
                      Eliminar
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivar(i.id)}
                      style={{ background: "none", border: "none", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", cursor: "pointer", padding: 0 }}
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
