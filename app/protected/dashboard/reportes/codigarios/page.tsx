"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"
type Codigario = { id: number; nombre: string }
type ItemCodigario = {
  codigo:                string
  nombre:                string
  descripcion:           string | null
  porcentajeComputable:  number
  activo:                boolean
}
type FilaCodigario = {
  codigarioId:     number
  codigarioNombre: string
  items:           ItemCodigario[]
}
type VistaCodigarios = { datos: FilaCodigario[] }
const th: React.CSSProperties = {
  textAlign: "left", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
  textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-secondary)",
  padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)",
  background: "var(--color-surface-raised)",
}
const td: React.CSSProperties = {
  padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
  borderBottom: "1px solid var(--color-border)", verticalAlign: "middle",
}
export default function ReporteCodigariosPage() {
  const { authHeaders } = useAuth()
  const { descargar, descargando, error: errorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaCodigarios>()
  const [codigarios, setCodigarios] = useState<Codigario[]>([])
  const [loadingCodigarios, setLoadingCodigarios] = useState(true)
  const [codigarioId, setCodigarioId] = useState("")
  const [filtrosVistos, setFiltrosVistos] = useState<string | null>(null)
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return
    const fetchCodigarios = async () => {
      try {
        setLoadingCodigarios(true)
        const res = await fetch("/api/codigarios", { headers: authHeaders })
        const data = await res.json()
        setCodigarios(Array.isArray(data) ? data : data?.data ?? [])
        fetchedRef.current = true
      } catch {
        setCodigarios([])
      } finally {
        setLoadingCodigarios(false)
      }
    }
    fetchCodigarios()
  }, [authHeaders?.Authorization])
  const armarUrl = () => {
    const params = new URLSearchParams()
    if (codigarioId) params.set("codigarioId", codigarioId)
    const query = params.toString()
    return `/api/reportes/codigarios${query ? `?${query}` : ""}`
  }
  const clavesFiltros = () => JSON.stringify({ codigarioId })

  const handleDescargar = () => descargar(armarUrl())
  const handleVer        = () => { verEnPantalla(armarUrl()); setFiltrosVistos(clavesFiltros()) }

  const filtrosDesactualizados = filtrosVistos !== null && filtrosVistos !== clavesFiltros()
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Codigarios y artículos</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF con el listado de codigarios y sus artículos asociados.
        </p>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Codigario <span style={{ color: "var(--color-text-hint)" }}>(opcional)</span></label>
          <select
            value={codigarioId}
            onChange={e => setCodigarioId(e.target.value)}
            style={{ padding: "var(--space-2)" }}
            disabled={loadingCodigarios}
          >
            <option value="">{loadingCodigarios ? "Cargando..." : "Todos"}</option>
            {!loadingCodigarios && codigarios.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleVer}
          disabled={cargando}
          style={{ padding: "var(--space-2) var(--space-4)", background: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.6 : 1 }}
        >
          {cargando ? "Cargando..." : "Ver en pantalla"}
        </button>
        <button
          onClick={handleDescargar}
          disabled={descargando}
          style={{ padding: "var(--space-2) var(--space-4)", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: descargando ? "not-allowed" : "pointer", opacity: descargando ? 0.6 : 1 }}
        >
          {descargando ? "Generando..." : "Descargar PDF"}
        </button>
      </div>
      {errorDescarga && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: "var(--radius-md)", padding: "var(--space-3)", color: "#ef4444", fontSize: "var(--text-sm)" }}>
          {errorDescarga}
        </div>
      )}
      {visible && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Vista en pantalla
            </span>
            <button
              onClick={() => { cerrarVista(); setFiltrosVistos(null) }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-hint)", fontSize: "var(--text-base)", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: "var(--space-4)" }}>
            {cargando ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                Cargando...
              </div>
            ) : filtrosDesactualizados ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                Los filtros cambiaron desde que se generó esta vista. Volvé a "Ver en pantalla" para actualizarla — si descargás el PDF ahora, va a reflejar los filtros nuevos, no lo que ves acá abajo.
              </div>
            ) : errorVista ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                {errorVista}
              </div>
            ) : !datos || datos.datos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                No hay codigarios para mostrar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {datos.datos.map(c => (
                  <div key={c.codigarioId}>
                    <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
                      {c.codigarioNombre}
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Código", "Nombre", "Descripción", "% Computable", "Estado"].map(col => (
                            <th key={col} style={th}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {c.items.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--color-text-hint)" }}>
                              Sin artículos
                            </td>
                          </tr>
                        ) : c.items.map((item, i) => (
                          <tr key={`${c.codigarioId}-${item.codigo}-${i}`}>
                            <td style={td}>{item.codigo}</td>
                            <td style={td}>{item.nombre}</td>
                            <td style={td}>{item.descripcion ?? "-"}</td>
                            <td style={td}>{item.porcentajeComputable}%</td>
                            <td style={{ ...td, color: item.activo ? "var(--color-success-text, #16a34a)" : "var(--color-text-hint)" }}>
                              {item.activo ? "Activo" : "Inactivo"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}