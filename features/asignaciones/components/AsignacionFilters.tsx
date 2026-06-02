// features/asignaciones/components/AsignacionFilters.tsx

const s = {
  input: {
    width:        "100%",
    background:   "var(--color-surface)",
    border:       "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding:      "8px 12px",
    fontSize:     "var(--text-sm)",
    color:        "var(--color-text-primary)",
    outline:      "none",
  },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--color-border)"
  e.target.style.boxShadow   = "none"
}

type Props = {
  busqueda:        string
  verInactivas:    boolean
  onBusqueda:      (v: string) => void
  onVerInactivas:  (v: boolean) => void
}

export function AsignacionFilters({ busqueda, verInactivas, onBusqueda, onVerInactivas }: Props) {
  return (
    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
      <input
        placeholder="Buscar por titular, identificador o documento..."
        value={busqueda}
        onChange={e => onBusqueda(e.target.value)}
        style={{ ...s.input, flex: 1 }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" as const }}>
        <input
          type="checkbox"
          checked={verInactivas}
          onChange={e => onVerInactivas(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        Ver inactivas
      </label>
    </div>
  )
}