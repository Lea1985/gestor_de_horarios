//features/incidencias/components/CadenaTable.tsx
import { useRouter } from "next/navigation"
import type { CadenaItem } from "../types"

function diasEntre(desde: string, hasta: string): number {
  const d1 = new Date(desde)
  const d2 = new Date(hasta)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
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

export function CadenaTable({ cadena, idActual }: {
  cadena:   CadenaItem[]
  idActual: number
}) {
  const router = useRouter()

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Cadena de incidencias
        </span>
        {cadena.length > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
            {cadena.length} incidencia{cadena.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["ID", "Tipo", "Desde", "Hasta", "Días"].map(col => (
              <th key={col} style={th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cadena.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                Sin cadena asociada
              </td>
            </tr>
          ) : cadena.map(item => {
            const esActual  = item.id === idActual
            const diasItem  = diasEntre(item.fecha_desde, item.fecha_hasta)
            return (
              <tr
                key={item.id}
                style={{
                  transition: "background 0.1s",
                  cursor:     esActual ? "default" : "pointer",
                  background: esActual ? "var(--color-surface-raised)" : "transparent",
                }}
                onClick={() => !esActual && router.push(`/protected/dashboard/incidencias/${item.id}`)}
                onMouseEnter={e => { if (!esActual) e.currentTarget.style.background = "var(--color-surface-raised)" }}
                onMouseLeave={e => { e.currentTarget.style.background = esActual ? "var(--color-surface-raised)" : "transparent" }}
              >
                <td style={td}>
                  <span style={{ fontWeight: esActual ? "var(--font-medium)" as const : undefined, color: esActual ? "var(--color-accent)" : undefined }}>
                    #{item.id}{esActual ? " ←" : ""}
                  </span>
                </td>
                <td style={td}>{item.tipo ?? "—"}</td>
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {item.fecha_desde?.slice(0, 10)}
                </td>
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {item.fecha_hasta?.slice(0, 10)}
                </td>
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {diasItem}d
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}