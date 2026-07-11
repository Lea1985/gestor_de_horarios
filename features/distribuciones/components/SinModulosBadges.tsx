// features/distribuciones/components/SinModulosBadges.tsx
// Hermano de SinDistribucionBadges: acá la asignación SÍ tiene distribución,
// pero esa distribución todavía no tiene ningún módulo horario asignado —
// es decir, no genera (ni va a generar) ninguna clase programada hasta que
// alguien complete el paso de /modulos.

import type { Distribucion } from "../types"

type Props = {
  distribuciones: Distribucion[]
}

export function SinModulosBadges({ distribuciones }: Props) {
  if (distribuciones.length === 0) return null

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
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-error)" }}>
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Distribuciones sin módulos asignados ({distribuciones.length})
      </div>
      <p style={{
        margin: 0,
        padding: "10px 16px",
        fontSize: "var(--text-xs)",
        color: "var(--color-text-hint)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        Estas distribuciones no generan clases programadas hasta que se les asignen módulos.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", padding: "var(--space-4)" }}>
        {distribuciones.map(d => (
          <a
            key={d.id}
            href={`/protected/dashboard/distribuciones/${d.id}/modulos`}
            style={{
              fontSize: "var(--text-xs)",
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
              fontFamily: "var(--font-mono)",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            {d.asignacion.identificadorEstructural} · v{d.version}
          </a>
        ))}
      </div>
    </div>
  )
}
