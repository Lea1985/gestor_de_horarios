"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"
type Comision = { id: number; nombre: string; curso?: { nombre: string } }
type FilaHorario = {
  moduloId:       number
  dia:            string
  horaDesde:      number
  horaHasta:      number
  materia:        string | null
  identificador:  string
  titularNombre:  string
  titularDNI:     string
  aCargoNombre?:  string
  aCargosDNI?:    string
  esSuplente?:    boolean
}
type DatosHorarios = {
  comision: { id: number; nombre: string; curso: string; turno: string; unidad: string | null }
  filas:    FilaHorario[]
}
type VistaHorarios = { datos: DatosHorarios[]; conACargoAhora: boolean }
const DIAS_ES: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
}
function formatHora(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
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
export default function ReporteHorariosPage() {
  const { authHeaders } = useAuth()
  const { descargar, descargando, error: errorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaHorarios>()
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [loadingComisiones, setLoadingComisiones] = useState(true)
  const [comisionId, setComisionId] = useState("")
  const [aCargoAhora, setACargoAhora] = useState(false)
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return
    const fetchComisiones = async () => {
      try {
        setLoadingComisiones(true)
        const res = await fetch("/api/comisiones", { headers: authHeaders })
        const data = await res.json()
        const arr: Comision[] = Array.isArray(data) ? data : data?.data ?? []
        setComisiones(arr)
        fetchedRef.current = true
      } catch {
        setComisiones([])
      } finally {
        setLoadingComisiones(false)
      }
    }
    fetchComisiones()
  }, [authHeaders?.Authorization])
  const armarUrl = () => {
    const params = new URLSearchParams({ aCargoAhora: String(aCargoAhora) })
    if (comisionId) params.set("comisionId", comisionId)
    return `/api/reportes/horarios?${params.toString()}`
  }
  const handleDescargar = () => descargar(armarUrl())
  const handleVer        = () => verEnPantalla(armarUrl())
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Horarios por comisión</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF con la grilla horaria de una comisión, o de todas.
        </p>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Comisión</label>
          <select
            value={comisionId}
            onChange={e => setComisionId(e.target.value)}
            style={{ padding: "var(--space-2)" }}
            disabled={loadingComisiones}
          >
            <option value="">{loadingComisiones ? "Cargando..." : "Todas"}</option>
            {!loadingComisiones && comisiones.map(c => (
              <option key={c.id} value={c.id}>{c.curso?.nombre ? `${c.curso.nombre} — ` : ""}{c.nombre}</option>
            ))}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", cursor: "pointer", paddingBottom: 8 }}>
          <input type="checkbox" checked={aCargoAhora} onChange={e => setACargoAhora(e.target.checked)} />
          Ver profesor a cargo ahora
        </label>
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
                No hay comisiones para mostrar.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {datos.datos.map(grupo => (
                  <div key={grupo.comision.id}>
                    <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
                      {grupo.comision.curso} — {grupo.comision.nombre}
                    </h3>
                    {grupo.filas.length === 0 ? (
                      <div style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                        Sin módulos asignados para esta comisión.
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Día", "Horario", "Materia", "Identificador", "Titular", "DNI", ...(datos.conACargoAhora ? ["A cargo ahora"] : [])].map(col => (
                              <th key={col} style={th}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.filas.map((f) => (
                            <tr key={f.moduloId}>
                              <td style={td}>{DIAS_ES[f.dia] ?? f.dia}</td>
                              <td style={td}>{formatHora(f.horaDesde)}–{formatHora(f.horaHasta)}</td>
                              <td style={td}>{f.materia ?? "-"}</td>
                              <td style={td}>{f.identificador}</td>
                              <td style={td}>{f.titularNombre}</td>
                              <td style={td}>{f.titularDNI}</td>
                              {datos.conACargoAhora && (
                                <td style={{ ...td, fontWeight: f.esSuplente ? "var(--font-medium)" : undefined, color: f.esSuplente ? "var(--color-accent)" : undefined }}>
                                  {f.esSuplente ? (f.aCargoNombre ?? "-") : f.titularNombre}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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