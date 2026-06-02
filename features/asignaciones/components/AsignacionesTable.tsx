// features/asignaciones/components/AsignacionesTable.tsx

import { useRouter } from "next/navigation"
import type { Asignacion } from "../types"
import { titularVigente } from "../types"

const s = {
  th: {
    textAlign:     "left"      as const,
    fontSize:      "var(--text-2xs)",
    fontWeight:    "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color:         "var(--color-text-secondary)",
    padding:       "10px 12px",
    borderBottom:  "1px solid var(--color-border-strong)",
    background:    "var(--color-surface-raised)",
  },
  td: {
    padding:       "10px 12px",
    fontSize:      "var(--text-sm)",
    color:         "var(--color-text-primary)",
    borderBottom:  "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

type Props = {
  asignaciones: Asignacion[]
  verInactivas: boolean
}

export function AsignacionesTable({ asignaciones, verInactivas }: Props) {
  const router = useRouter()

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Titular vigente", "Unidad", "Identificador", "Contexto", "Inicio", ""].map(col => (
              <th key={col} style={s.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {asignaciones.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                No hay asignaciones{!verInactivas ? " activas" : ""} registradas
              </td>
            </tr>
          ) : asignaciones.map(a => {
            const titular = titularVigente(a)
            return (
              <tr
                key={a.id}
                style={{ transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={s.td}>
                  {titular
                    ? `${titular.apellido}, ${titular.nombre}`
                    : <em style={{ color: "var(--color-text-hint)" }}>Vacante</em>
                  }
                  {!a.activo && (
                    <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                      Inactivo
                    </span>
                  )}
                </td>
                <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                  {a.unidad.nombre}
                </td>
                <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {a.identificadorEstructural}
                </td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {[a.turno?.nombre, a.comision?.nombre, a.materia?.nombre].filter(Boolean).join(" · ") || "—"}
                </td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {a.fecha_inicio.split("T")[0]}
                </td>
                <td style={s.td}>
                  <button
                    onClick={() => router.push(`/protected/dashboard/asignaciones/${a.id}`)}
                    style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
