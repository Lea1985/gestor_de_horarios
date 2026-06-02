"use client"
import { useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Suplente = {
  agente: { nombre: string; apellido: string; documento: string }
  cantidad: number
}

export default function ReemplazosPage() {
  const { authHeaders } = useAuth()
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ total: number; porSuplente: Suplente[]; reemplazos: any[] } | null>(null)

  const buscar = async () => {
    if (!fechaDesde || !fechaHasta) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reportes/reemplazos?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`, {
        headers: authHeaders,
      })
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Reporte de reemplazos</h1>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Fecha desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: "var(--space-2)" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Fecha hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: "var(--space-2)" }} />
        </div>
        <button onClick={buscar} disabled={loading} style={{ padding: "var(--space-2) var(--space-4)", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
          {loading ? "Cargando..." : "Buscar"}
        </button>
      </div>

      {data && (
        <>
          <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)" }}>
            <p>Total de reemplazos en el período: <strong>{data.total}</strong></p>
          </div>

          <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)" }}>
            <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>Top suplentes</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Suplente</th>
                  <th style={{ textAlign: "right", padding: "var(--space-2)" }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.porSuplente.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "var(--space-2)" }}>{s.agente.apellido} {s.agente.nombre}</td>
                    <td style={{ textAlign: "right", padding: "var(--space-2)" }}>{s.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)" }}>
            <summary style={{ cursor: "pointer", fontWeight: "var(--font-medium)" }}>Ver detalle de reemplazos</summary>
            <div style={{ overflowX: "auto", marginTop: "var(--space-4)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Fecha</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Unidad</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Suplente</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Titular reemplazado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reemplazos.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "var(--space-2)" }}>{new Date(r.clase.fecha).toLocaleDateString()}</td>
                      <td style={{ padding: "var(--space-2)" }}>{r.clase.unidad?.nombre || "-"}</td>
                      <td style={{ padding: "var(--space-2)" }}>{r.agenteSuplente?.apellido} {r.agenteSuplente?.nombre}</td>
                      <td style={{ padding: "var(--space-2)" }}>{r.asignacionTitular?.titularidades?.[0]?.agente?.apellido || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  )
}