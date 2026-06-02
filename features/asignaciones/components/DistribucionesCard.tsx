// features/asignaciones/components/DistribucionesCard.tsx

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

function Badge({ estado }: { estado: string }) {
  const activo = estado === "ACTIVO"
  return (
    <span style={{
      display:    "inline-block",
      padding:    "2px 8px",
      borderRadius: "var(--radius-sm)",
      fontSize:   "var(--text-2xs)",
      fontWeight: "var(--font-medium)",
      background: activo ? "var(--color-success-bg)" : "var(--color-error-bg)",
      color:      activo ? "var(--color-success-text)" : "var(--color-error-text)",
    }}>
      {estado}
    </span>
  )
}

type Props = {
  distribuciones: NonNullable<AsignacionDetalle["distribuciones"]>
}

export function DistribucionesCard({ distribuciones }: Props) {
  const router = useRouter()

  if (distribuciones.length === 0) return null

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Distribuciones horarias
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
          {distribuciones.length} versión{distribuciones.length !== 1 ? "es" : ""}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Versión", "Estado", "Vigencia desde", "Vigencia hasta", ""].map(col => (
              <th key={col} style={s.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {distribuciones.map(d => (
            <tr
              key={d.id}
              style={{ cursor: "pointer", transition: "background 0.1s" }}
              onClick={() => router.push(`/protected/dashboard/distribuciones/${d.id}/modulos`)}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={s.td}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>v{d.version}</span>
              </td>
              <td style={s.td}><Badge estado={d.estado} /></td>
              <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {d.fecha_vigencia_desde.slice(0, 10)}
              </td>
              <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {d.fecha_vigencia_hasta?.slice(0, 10) ?? (
                  <span style={{ color: "var(--color-text-hint)" }}>Indefinida</span>
                )}
              </td>
              <td style={s.td}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>
                  Módulos →
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}