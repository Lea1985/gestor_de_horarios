//features/incidencias/components/LinkIncidencia.tsx
export function LinkIncidencia({ id, actual, onClick }: {
  id:      number
  actual:  boolean
  onClick: () => void
}) {
  if (actual) {
    return (
      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>
        #{id}{" "}
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", fontWeight: 400 }}>(esta)</span>
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}
    >
      #{id} →
    </button>
  )
}