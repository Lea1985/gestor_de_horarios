//features/incidencias/components/ResultadoCarga.tsx
import { useRouter } from "next/navigation"
import type { ResultadoCarga as TResultado, ResultadoReemplazo as TResultadoReemplazo } from "../types"

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

export function ResultadoCarga({ resultado, resultadoReemplazos, onReintentar }: {
  resultado:            TResultado[]
  resultadoReemplazos?: TResultadoReemplazo[] | null
  onReintentar:         () => void
}) {
  const router   = useRouter()
  const exitosos = resultado.filter(r => r.ok).length
  const fallidos = resultado.filter(r => !r.ok).length

  const exitososReemplazos = (resultadoReemplazos ?? []).filter(r => r.ok).length
  const fallidosReemplazos = (resultadoReemplazos ?? []).filter(r => !r.ok).length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 700 }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Resultado de la carga
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          {exitosos} creada{exitosos !== 1 ? "s" : ""} correctamente
          {fallidos > 0 && ` · ${fallidos} con error`}
        </p>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Agente", "Identificador", "Estado"].map(col => (
                <th key={col} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.map(r => (
              <tr key={r.asignacionId}>
                <td style={td}>{r.agente}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {r.identificador}
                </td>
                <td style={td}>
                  {r.ok
                    ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-success-text)", background: "var(--color-success-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>OK</span>
                    : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{r.error}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UX-INC-002: resultado de los reemplazos del paso 4 (antes se
          descartaba silenciosamente y el usuario nunca se enteraba de
          cuáles habían fallado). Solo se muestra si se intentó crear
          al menos un reemplazo. */}
      {resultadoReemplazos && resultadoReemplazos.length > 0 && (
        <div>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
            Reemplazos asignados
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)" }}>
            {exitososReemplazos} asignado{exitososReemplazos !== 1 ? "s" : ""} correctamente
            {fallidosReemplazos > 0 && ` · ${fallidosReemplazos} con error — revisá el detalle de la incidencia correspondiente para asignarlos manualmente`}
          </p>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Agente", "Identificador", "Fecha", "Módulo", "Estado"].map(col => (
                    <th key={col} style={th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultadoReemplazos.map(r => (
                  <tr key={r.claseId}>
                    <td style={td}>{r.agente}</td>
                    <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                      {r.identificador}
                    </td>
                    <td style={td}>{r.fecha}</td>
                    <td style={td}>{r.modulo}</td>
                    <td style={td}>
                      {r.ok
                        ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-success-text)", background: "var(--color-success-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>OK</span>
                        : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{r.error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button
          onClick={() => router.push("/protected/dashboard/incidencias")}
          style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}
        >
          Ir a incidencias
        </button>
        {fallidos > 0 && (
          <button
            onClick={onReintentar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Reintentar fallidas
          </button>
        )}
      </div>
    </div>
  )
}