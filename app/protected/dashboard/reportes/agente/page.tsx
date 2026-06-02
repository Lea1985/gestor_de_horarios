"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Agente = { id: number; nombre: string; apellido: string; documento: string }

export default function ReporteAgentePage() {
  const { authHeaders } = useAuth()
  const [agentes, setAgentes] = useState<Agente[]>([])
  const [loadingAgentes, setLoadingAgentes] = useState(true)
  const [agenteId, setAgenteId] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [reporte, setReporte] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return

    const fetchAgentes = async () => {
      try {
        setLoadingAgentes(true)
        const res = await fetch("/api/agentes", { headers: authHeaders })
        const data = await res.json()
        let agentesArray: Agente[] = []
        if (Array.isArray(data)) agentesArray = data
        else if (data?.data && Array.isArray(data.data)) agentesArray = data.data
        else if (data?.agentes && Array.isArray(data.agentes)) agentesArray = data.agentes
        else agentesArray = []
        setAgentes(agentesArray)
        fetchedRef.current = true
      } catch (error) {
        console.error("Error cargando agentes:", error)
        setAgentes([])
      } finally {
        setLoadingAgentes(false)
      }
    }

    fetchAgentes()
  }, [authHeaders?.Authorization])

  const buscar = async () => {
    if (!agenteId || !fechaDesde || !fechaHasta) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reportes/agente/${agenteId}?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`, {
        headers: authHeaders,
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      // Normalizar: a veces la respuesta viene dentro de "data"
      const reporteData = json?.data ?? json
      if (!reporteData.agente) {
        throw new Error("La respuesta no contiene datos de agente")
      }
      setReporte(reporteData)
    } catch (error: any) {
      console.error(error)
      setError(error.message)
      setReporte(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Reporte por agente</h1>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)" }}>Agente</label>
          <select
            value={agenteId}
            onChange={e => setAgenteId(e.target.value)}
            style={{ padding: "var(--space-2)" }}
            disabled={loadingAgentes}
          >
            <option value="">{loadingAgentes ? "Cargando..." : "Seleccionar"}</option>
            {!loadingAgentes && agentes.map(a => (
              <option key={a.id} value={a.id}>{a.apellido} {a.nombre}</option>
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

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: "var(--radius-md)", padding: "var(--space-3)", color: "#ef4444" }}>
          Error: {error}
        </div>
      )}

      {reporte && reporte.agente && (
        <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)" }}>
          <h2>{reporte.agente.apellido} {reporte.agente.nombre}</h2>
          <p>Período: {new Date(reporte.periodo.desde).toLocaleDateString()} - {new Date(reporte.periodo.hasta).toLocaleDateString()}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
            <div>Total clases: <strong>{reporte.resumen.total}</strong></div>
            <div>Dictadas: <strong>{reporte.resumen.dictadas}</strong> ({reporte.resumen.porcentajeDictadas}%)</div>
            <div>Suspendidas: <strong>{reporte.resumen.suspendidas}</strong> ({reporte.resumen.porcentajeSuspendidas}%)</div>
            <div>Reemplazadas: <strong>{reporte.resumen.reemplazadas}</strong></div>
            <div>Reemplazos como titular: <strong>{reporte.resumen.reemplazosComoTitular}</strong></div>
            <div>Reemplazos como suplente: <strong>{reporte.resumen.reemplazosComoSuplente}</strong></div>
          </div>

          {reporte.incidencias && reporte.incidencias.length > 0 && (
            <details style={{ marginTop: "var(--space-4)" }}>
              <summary style={{ cursor: "pointer" }}>Incidencias en el período ({reporte.incidencias.length})</summary>
              <ul style={{ marginTop: "var(--space-2)" }}>
                {reporte.incidencias.map((inc: any) => (
                  <li key={inc.id}>{inc.codigarioItem?.codigo} - {inc.codigarioItem?.nombre} ({new Date(inc.fecha_desde).toLocaleDateString()} a {new Date(inc.fecha_hasta).toLocaleDateString()})</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}