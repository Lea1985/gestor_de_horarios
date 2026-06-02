//features/incidencias/components/Campo.tsx
const label = {
  fontSize:     "var(--text-xs)",
  fontWeight:   "var(--font-medium)" as const,
  color:        "var(--color-text-secondary)",
  display:      "block" as const,
  marginBottom: "var(--space-1)",
}

const value = {
  fontSize:   "var(--text-sm)",
  color:      "var(--color-text-primary)",
  fontWeight: "var(--font-medium)" as const,
}

export function Campo({ label: labelText, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={label}>{labelText}</span>
      <div style={value}>{children}</div>
    </div>
  )
}