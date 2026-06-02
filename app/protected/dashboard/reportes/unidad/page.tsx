"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Unidad = { id: number; nombre: string; tipo: string }

export default function ReporteUnidadPage() {
  const { authHeaders } = useAuth()
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(true)
  const [unidadId, setUnidadId] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [reporte, setReporte] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Flag para evitar múltiples llamadas
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Evitar ejecutar si ya se cargó una vez
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return

    const fetchUnidades = async () => {
      try {
        setLoadingUnidades(true)
        const res = await fetch("/api/unidades", { headers: authHeaders })
        const data = await res.json()
        let unidadesArray: Unidad[] = []
        if (Array.isArray(data)) unidadesArray = data
        else if (data?.data && Array.isArray(data.data)) unidadesArray = data.data
        else if (data?.unidades && Array.isArray(data.unidades)) unidadesArray = data.unidades
        else unidadesArray = []
        setUnidades(unidadesArray)
        fetchedRef.current = true
      } catch (error) {
        console.error("Error cargando unidades:", error)
        setUnidades([])
      } finally {
        setLoadingUnidades(false)
      }
    }

    fetchUnidades()
  }, [authHeaders?.Authorization]) // Dependencia solo del token string

  const buscar = async () => {
    if (!unidadId || !fechaDesde || !fechaHasta) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reportes/unidad/${unidadId}?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`, {
        headers: authHeaders,
      })
      const json = await res.json()
      setReporte(json)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Reporte por unidad</h1>

      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)" }}>Unidad</label>
          <select 
            value={unidadId} 
            onChange={e => setUnidadId(e.target.value)} 
            style={{ padding: "var(--space-2)" }}
            disabled={loadingUnidades}
          >
            <option value="">{loadingUnidades ? "Cargando..." : "Seleccionar"}</option>
            {!loadingUnidades && unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.tipo})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)" }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)" }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button onClick={buscar} disabled={loading} style={{ padding: "var(--space-2) var(--space-4)", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)" }}>
          {loading ? "Cargando..." : "Buscar"}
        </button>
      </div>

      {reporte && (
        <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)" }}>
          <h2>{reporte.unidad.nombre}</h2>
          <p>Período: {new Date(reporte.periodo.desde).toLocaleDateString()} - {new Date(reporte.periodo.hasta).toLocaleDateString()}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
            <div>Total clases: <strong>{reporte.resumen.total}</strong></div>
            <div>Programadas: <strong>{reporte.resumen.programadas}</strong></div>
            <div>Dictadas: <strong>{reporte.resumen.dictadas}</strong></div>
            <div>Suspendidas: <strong>{reporte.resumen.suspendidas}</strong></div>
            <div>Reemplazadas: <strong>{reporte.resumen.reemplazadas}</strong></div>
          </div>

          <details style={{ marginTop: "var(--space-4)" }}>
            <summary style={{ cursor: "pointer" }}>Ver detalle de clases</summary>
            <div style={{ overflowX: "auto", marginTop: "var(--space-4)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Fecha</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Módulo</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Docente</th>
                    <th style={{ textAlign: "left", padding: "var(--space-2)" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.clases.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "var(--space-2)" }}>{new Date(c.fecha).toLocaleDateString()}</td>
                      <td style={{ padding: "var(--space-2)" }}>{c.modulo?.dia_semana} {c.modulo?.hora_desde}:00</td>
                      <td style={{ padding: "var(--space-2)" }}>{c.asignacion?.titularidades?.[0]?.agente?.apellido || "-"}</td>
                      <td style={{ padding: "var(--space-2)" }}>{c.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}