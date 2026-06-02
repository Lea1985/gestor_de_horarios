// features/asignaciones/components/TitularCard.tsx

type Agente = {
  id:        number
  nombre:    string
  apellido:  string
  documento: string
  email?:    string
  telefono?: string
}

const s = {
  label: {
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-medium)" as const,
    color:        "var(--color-text-secondary)",
    display:      "block" as const,
    marginBottom: "var(--space-1)",
  },
  value: {
    fontSize:   "var(--text-sm)",
    color:      "var(--color-text-primary)",
    fontWeight: "var(--font-medium)" as const,
  },
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={s.label}>{label}</span>
      <div style={s.value}>{children}</div>
    </div>
  )
}

type Props = {
  titular:          Agente | null
  onCambiarTitular: () => void
}

export function TitularCard({ titular, onCambiarTitular }: Props) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Titular vigente
        </h2>
        <button
          onClick={onCambiarTitular}
          style={{ background: "none", border: "1px solid var(--color-border-strong)", borderRadius: "var(--radius-lg)", padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
        >
          Cambiar titular
        </button>
      </div>

      {titular ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
          <Campo label="Nombre">
            {titular.apellido}, {titular.nombre}
          </Campo>
          <Campo label="Documento">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
              {titular.documento}
            </span>
          </Campo>
          {titular.email    && <Campo label="Email">{titular.email}</Campo>}
          {titular.telefono && <Campo label="Teléfono">{titular.telefono}</Campo>}
        </div>
      ) : (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)", fontStyle: "italic" }}>
          Cargo vacante — sin titular asignado
        </p>
      )}
    </div>
  )
}
