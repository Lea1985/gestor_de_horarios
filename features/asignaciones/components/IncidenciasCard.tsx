// features/asignaciones/components/IncidenciasCard.tsx
import { useRouter } from "next/navigation"
import type { AsignacionDetalle } from "../hooks/useAsignacionDetalle"
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
function Badge({ activo }: { activo: boolean }) {
  return (
    <span style={{
      display:      "inline-block",
      padding:      "2px 8px",
      borderRadius: "var(--radius-sm)",
      fontSize:     "var(--text-2xs)",
      fontWeight:   "var(--font-medium)",
      background:   activo ? "var(--color-success-bg)" : "var(--color-error-bg)",
      color:        activo ? "var(--color-success-text)" : "var(--color-error-text)",
    }}>
      {activo ? "Activa" : "Eliminada"}
    </span>
  )
}
type Props = {
  incidencias: NonNullable<AsignacionDetalle["incidencias"]>
}
export function IncidenciasCard({ incidencias }: Props) {
  const router = useRouter()
  if (incidencias.length === 0) return null
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Incidencias
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
          {incidencias.length} registrada{incidencias.length !== 1 ? "s" : ""}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Tipo", "Desde", "Hasta", "Estado"].map(col => (
              <th key={col} style={s.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidencias.map(i => (
            <tr
              key={i.id}
              style={{ cursor: "pointer", transition: "background 0.1s" }}
              onClick={() => router.push(`/protected/dashboard/incidencias/${i.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={s.td}>
                {i.codigarioItem ? (
                  <>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {i.codigarioItem.codigo}
                    </span>
                    {" "}{i.codigarioItem.nombre}
                  </>
                ) : "—"}
              </td>
              <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {i.fecha_desde.slice(0, 10)}
              </td>
              <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {i.fecha_hasta.slice(0, 10)}
              </td>
              <td style={s.td}>
                <Badge activo={i.activo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}