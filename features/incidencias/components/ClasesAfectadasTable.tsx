// features/incidencias/components/ClasesAfectadasTable.tsx
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

export function ClasesAfectadasTable({
  clases,
  onAgregarReemplazo,
  onEliminarReemplazo,
  onAusenciaSuplente,
}: {
  clases:               ClaseAfectada[]
  onAgregarReemplazo:   (clase: ClaseAfectada) => void
  onEliminarReemplazo:  (reemplazoId: number) => void
  onAusenciaSuplente:   (reemplazoId: number, nombreSuplente: string) => void
}) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>

      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Clases afectadas
        </span>
        {clases.length > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
            {clases.length} clase{clases.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

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
            const cadena          = [...clase.reemplazos].sort((a, b) => a.id - b.id)

            return (
              <tr
                key={clase.id}
                style={{ transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Fecha */}
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {clase.fecha?.slice(0, 10).split("-").reverse().join("/")}
                </td>

                {/* Módulo */}
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {clase.modulo
                    ? `${clase.modulo.dia_semana} · ${formatHora(clase.modulo.hora_desde)}–${formatHora(clase.modulo.hora_hasta)}`
                    : "—"
                  }
                </td>

                {/* Estado */}
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

                {/* Reemplazante */}
                <td style={td}>
                  {cadena.length === 0 ? (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>Sin cubrir</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {cadena.map((r, i) => (
                        <span
                          key={r.id}
                          style={{
                            fontSize:       "var(--text-xs)",
                            color:          r.activo ? "var(--color-text-primary)" : "var(--color-text-hint)",
                            fontWeight:     r.activo ? "var(--font-medium)" : 400,
                            textDecoration: r.activo ? "none" : "line-through",
                          }}
                        >
                          {i + 1}. {nombreSuplente(r)}
                          {r.activo && (
                            <span style={{ marginLeft: 4, fontSize: "var(--text-2xs)", color: "var(--color-accent)" }}>
                              ● activo
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                {/* Acciones */}
                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", alignItems: "flex-start" }}>
                    {reemplazoActivo ? (
                      <>
                        <button
                          onClick={() => onAusenciaSuplente(reemplazoActivo.id, nombreSuplente(reemplazoActivo))}
                          style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}
                        >
                          Ausencia suplente
                        </button>
                        <button
                          onClick={() => onEliminarReemplazo(reemplazoActivo.id)}
                          style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                        >
                          Quitar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onAgregarReemplazo(clase)}
                        style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                </td>

              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}