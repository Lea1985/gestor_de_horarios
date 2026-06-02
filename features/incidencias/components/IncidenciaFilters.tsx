//features/incidencias/components/IncidenciaFilters.tsx
const inputStyle = {
  width:        "100%",
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding:      "8px 12px",
  fontSize:     "var(--text-sm)",
  color:        "var(--color-text-primary)",
  outline:      "none",
}

export function IncidenciaFilters({ busqueda, setBusqueda, verEliminadas, setVerEliminadas }: {
  busqueda:          string
  setBusqueda:       (v: string) => void
  verEliminadas:     boolean
  setVerEliminadas:  (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
      <input
        placeholder="Buscar por agente, asignación o tipo..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{ ...inputStyle, flex: 1 }}
        onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
        onBlur={e =>  { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" }}>
        <input
          type="checkbox"
          checked={verEliminadas}
          onChange={e => setVerEliminadas(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        Ver eliminadas
      </label>
    </div>
  )
}