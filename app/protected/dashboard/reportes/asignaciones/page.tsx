"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"

type Comision = { id: number; nombre: string; curso?: { nombre: string } }
type Agente   = { id: number; nombre: string; apellido: string; documento: string }

type Distribucion = {
  version: number
  vigente: boolean
  desde:   string
  hasta:   string | null
  modulos: string
}

type FilaAsignacion = {
  id:             number
  identificador:  string
  titular:        string
  titularDNI:     string
  materia:        string | null
  comision:       string | null
  turno:          string
  unidad:         string
  distribuciones: Distribucion[]
}

type VistaAsignaciones = { datos: FilaAsignacion[]; filtroTexto?: string }

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

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

export default function ReporteAsignacionesPage() {
  const { authHeaders } = useAuth()
  const { descargar, descargando, error: errorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaAsignaciones>()

  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [agentes, setAgentes]       = useState<Agente[]>([])
  const [loadingFiltros, setLoadingFiltros] = useState(true)

  const [comisionId, setComisionId] = useState("")
  const [agenteId, setAgenteId]     = useState("")

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return

    const fetchFiltros = async () => {
      try {
        setLoadingFiltros(true)
        const [resComisiones, resAgentes] = await Promise.all([
          fetch("/api/comisiones", { headers: authHeaders }),
          fetch("/api/agentes", { headers: authHeaders }),
        ])
        const dataComisiones = await resComisiones.json()
        const dataAgentes    = await resAgentes.json()
        setComisiones(Array.isArray(dataComisiones) ? dataComisiones : dataComisiones?.data ?? [])
        setAgentes(Array.isArray(dataAgentes) ? dataAgentes : dataAgentes?.data ?? [])
        fetchedRef.current = true
      } catch {
        setComisiones([])
        setAgentes([])
      } finally {
        setLoadingFiltros(false)
      }
    }
    fetchFiltros()
  }, [authHeaders?.Authorization])

  const armarUrl = () => {
    const params = new URLSearchParams()
    if (comisionId) params.set("comisionId", comisionId)
    if (agenteId)   params.set("agenteId", agenteId)
    const query = params.toString()
    return `/api/reportes/asignaciones${query ? `?${query}` : ""}`
  }

  const handleDescargar = () => descargar(armarUrl())
  const handleVer        = () => verEnPantalla(armarUrl())

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Asignaciones y distribuciones</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF con las asignaciones y sus distribuciones horarias, vigentes e históricas.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Comisión <span style={{ color: "var(--color-text-hint)" }}>(opcional)</span></label>
          <select value={comisionId} onChange={e => setComisionId(e.target.value)} style={{ padding: "var(--space-2)" }} disabled={loadingFiltros}>
            <option value="">Todas</option>
            {comisiones.map(c => (
              <option key={c.id} value={c.id}>{c.curso?.nombre ? `${c.curso.nombre} — ` : ""}{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Profesor <span style={{ color: "var(--color-text-hint)" }}>(opcional)</span></label>
          <select value={agenteId} onChange={e => setAgenteId(e.target.value)} style={{ padding: "var(--space-2)" }} disabled={loadingFiltros}>
            <option value="">Todos</option>
            {agentes.map(a => (
              <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>
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
              Vista en pantalla {datos?.filtroTexto ? `— ${datos.filtroTexto}` : ""}
            </span>
            <button
              onClick={cerrarVista}
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
            ) : errorVista ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                {errorVista}
              </div>
            ) : !datos || datos.datos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                No se encontraron asignaciones para los filtros seleccionados.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {datos.datos.map(a => (
                  <div key={a.id}>
                    <div style={{ marginBottom: "var(--space-2)" }}>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
                        {a.identificador} — {a.titular}{a.titularDNI !== "-" ? ` (DNI ${a.titularDNI})` : ""}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        {[a.materia, a.comision, a.turno, a.unidad].filter(Boolean).join(" — ")}
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Versión", "Estado", "Vigencia desde", "Vigencia hasta", "Módulos"].map(col => (
                            <th key={col} style={th}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {a.distribuciones.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--color-text-hint)" }}>
                              Sin distribuciones registradas
                            </td>
                          </tr>
                        ) : a.distribuciones.map(d => (
                          <tr key={d.version}>
                            <td style={td}>v{d.version}</td>
                            <td style={{ ...td, color: d.vigente ? "var(--color-success-text, #16a34a)" : "var(--color-text-hint)", fontWeight: d.vigente ? "var(--font-medium)" : undefined }}>
                              {d.vigente ? "Vigente" : "Histórica"}
                            </td>
                            <td style={td}>{formatFecha(d.desde)}</td>
                            <td style={td}>{d.hasta ? formatFecha(d.hasta) : "—"}</td>
                            <td style={td}>{d.modulos}</td>
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
