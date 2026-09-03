// features/distribuciones/components/SinDistribucionBadges.tsx
import type { Asignacion } from "../types"
type Props = {
  asignaciones: Asignacion[]
}
export function SinDistribucionBadges({ asignaciones }: Props) {
  if (asignaciones.length === 0) return null
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--font-medium)",
        color: "var(--color-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        Sin distribución asignada ({asignaciones.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", padding: "var(--space-4)" }}>
        {asignaciones.map(a => (
          <span
            key={a.id}
            style={{
              fontSize: "var(--text-xs)",
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-hint)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {a.identificadorEstructural}
            {a.unidad && (
              <span style={{ marginLeft: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                · {a.unidad.nombre}
              </span>
            )}
            {a.materia && (
              <span style={{ marginLeft: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                · {a.materia.nombre}
              </span>
            )}
            {a.comision && (
              <span style={{ marginLeft: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                · {a.comision.curso.nombre} ({a.comision.nombre})
              </span>
            )}
            {a.turno && (
              <span style={{ marginLeft: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                · {a.turno.nombre}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}