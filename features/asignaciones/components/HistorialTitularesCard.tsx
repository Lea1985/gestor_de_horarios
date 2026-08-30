// features/asignaciones/components/HistorialTitularesCard.tsx
import type { TitularHistorial } from "../types"

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

function BadgeVigente() {
  return (
    <span style={{
      display:      "inline-block",
      padding:      "2px 8px",
      borderRadius: "var(--radius-sm)",
      fontSize:     "var(--text-2xs)",
      fontWeight:   "var(--font-medium)",
      background:   "var(--color-success-bg)",
      color:        "var(--color-success-text)",
    }}>
      Vigente
    </span>
  )
}

type Props = {
  historial: TitularHistorial[]
}

export function HistorialTitularesCard({ historial }: Props) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Historial de titulares
        </span>
        {historial.length > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
            {historial.length} registro{historial.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {historial.length === 0 ? (
        <div style={{ padding: "var(--space-6)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
          Sin historial registrado
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Titular", "DNI", "Desde", "Hasta", ""].map(col => (
                <th key={col} style={s.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historial.map(t => (
              <tr key={t.id}>
                <td style={s.td}>{t.agente.apellido}, {t.agente.nombre}</td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {t.agente.documento}
                </td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {t.fecha_desde.slice(0, 10)}
                </td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {t.fecha_hasta?.slice(0, 10) ?? "—"}
                </td>
                <td style={s.td}>
                  {t.fecha_hasta === null && <BadgeVigente />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}