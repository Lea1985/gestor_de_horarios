// features/incidencias/components/Stepper.tsx

export function Stepper({ paso }: { paso: 1 | 2 | 3 | 4 }) {
  const pasos = [
    "Seleccionar",
    "Revisar lote",
    "Incidencia",
    "Reemplazos",
  ]

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
      {pasos.map((label, i) => {
        const n      = i + 1
        const activo = n === paso
        const hecho  = n < paso
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div style={{
              width:          24,
              height:         24,
              borderRadius:   "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       "var(--text-xs)",
              fontWeight:     "var(--font-medium)",
              background:     hecho
                ? "var(--color-success-bg)"
                : activo
                  ? "var(--color-primary)"
                  : "var(--color-surface-raised)",
              color: hecho
                ? "var(--color-success-text)"
                : activo
                  ? "white"
                  : "var(--color-text-hint)",
              border:     activo ? "none" : "1px solid var(--color-border)",
              flexShrink: 0,
            }}>
              {hecho ? "✓" : n}
            </div>
            <span style={{
              fontSize:   "var(--text-xs)",
              fontWeight: activo ? ("var(--font-medium)" as const) : 400,
              color:      activo ? "var(--color-text-primary)" : "var(--color-text-hint)",
              whiteSpace: "nowrap" as const,
            }}>
              {label}
            </span>
            {i < pasos.length - 1 && (
              <div style={{
                width:      24,
                height:     1,
                background: hecho ? "var(--color-success-text)" : "var(--color-border)",
                flexShrink: 0,
                opacity:    hecho ? 0.4 : 1,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
