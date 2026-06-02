import type { AsignacionParaIncidencia } from "../types"
import { nombreAgente } from "../hooks/useNuevaIncidencia"

const th = {
  textAlign:     "left" as const,
  fontSize:      "var(--text-2xs)",
  fontWeight:    "var(--font-medium)" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color:         "var(--color-text-secondary)",
  padding:       "10px 12px",
  borderBottom:  "1px solid var(--color-border-strong)",
  background:    "var(--color-surface-raised)",
}

const td = {
  padding:       "10px 12px",
  fontSize:      "var(--text-sm)",
  color:         "var(--color-text-primary)",
  borderBottom:  "1px solid var(--color-border)",
  verticalAlign: "middle" as const,
}

export function PasoRevision({ asignacionesLote, onVolver, onContinuar, onQuitar }: {
  asignacionesLote: AsignacionParaIncidencia[]
  onVolver:         () => void
  onContinuar:      () => void
  onQuitar:         (id: number) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Revisá el lote antes de continuar. Podés quitar asignaciones si es necesario.
      </p>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Agente", "Identificador", "Unidad", "Curso / Comisión", ""].map(col => (
                <th key={col} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {asignacionesLote.map(a => (
              <tr
                key={a.id}
                style={{ transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={td}>
                  {nombreAgente(a)}
                  <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                    {a.titularidades[0]?.agente.documento ?? "—"}
                  </span>
                </td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {a.identificadorEstructural}
                </td>
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {a.unidad.nombre}
                </td>
                <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {[a.comision?.curso?.nombre, a.comision?.nombre].filter(Boolean).join(" · ") || "—"}
                </td>
                <td style={td}>
                  <button
                    onClick={() => onQuitar(a.id)}
                    style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "space-between" }}>
        <button
          onClick={onVolver}
          style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
        >
          ← Agregar más
        </button>
        <button
          onClick={onContinuar}
          disabled={asignacionesLote.length === 0}
          style={{
            padding:      "9px 20px",
            borderRadius: "var(--radius-lg)",
            border:       "none",
            background:   "var(--color-primary)",
            color:        "white",
            fontSize:     "var(--text-sm)",
            fontWeight:   "var(--font-medium)",
            cursor:       asignacionesLote.length === 0 ? "not-allowed" : "pointer",
            opacity:      asignacionesLote.length === 0 ? 0.4 : 1,
          }}
        >
          Continuar →
        </button>
      </div>

    </div>
  )
}