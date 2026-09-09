"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"

type Comision = { id: number; nombre: string; curso?: { nombre: string } }
type Agente   = { id: number; nombre: string; apellido: string; documento: string }

type FilaAusencia = {
  incidenciaId:      number
  incidenciaPadreId: number | null
  esRaiz:            boolean
  tramoIndex:        number
  totalTramos:       number
  fechaDesde:        string
  fechaHasta:        string
  codigoArt:         string
  nombreArt:         string
  titularDNI:        string
  titularNombre:     string
  identificador:     string
  materia:           string | null
  comision:          string | null
  distribucion:      string
  reemplazante: {
    nombre:    string
    documento: string
  } | null
}

type VistaAusencias = {
  datos:       FilaAusencia[]
  periodo:     { desde: string; hasta: string }
  filtroTexto?: string
}

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
const tdRol: React.CSSProperties = {
  ...td, fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", textTransform: "uppercase", letterSpacing: "0.5px",
}

export default function ReporteAusenciasPage() {
  const { authHeaders } = useAuth()
  const { descargar, descargando, error: errorDescarga, setError: setErrorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaAusencias>()

  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [agentes, setAgentes]       = useState<Agente[]>([])
  const [loadingFiltros, setLoadingFiltros] = useState(true)

  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [comisionId, setComisionId] = useState("")
  const [agenteId, setAgenteId]     = useState("")
  const [filtrosVistos, setFiltrosVistos] = useState<string | null>(null)

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
    const params = new URLSearchParams({ desde: fechaDesde, hasta: fechaHasta })
    if (comisionId) params.set("comisionId", comisionId)
    if (agenteId)   params.set("agenteId", agenteId)
    return `/api/reportes/ausencias?${params.toString()}`
  }

  const validarFiltros = () => {
    if (!fechaDesde || !fechaHasta) {
      setErrorDescarga("Indicá el rango de fechas")
      return false
    }
    setErrorDescarga(null)
    return true
  }

  const clavesFiltros = () => JSON.stringify({ fechaDesde, fechaHasta, comisionId, agenteId })

  const handleDescargar = () => { if (validarFiltros()) descargar(armarUrl()) }
  const handleVer        = () => { if (validarFiltros()) { verEnPantalla(armarUrl()); setFiltrosVistos(clavesFiltros()) } }

  const filtrosDesactualizados = filtrosVistos !== null && filtrosVistos !== clavesFiltros()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Ausencias y reemplazos</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF con cada incidencia del período: datos del titular y, si lo hubo, del reemplazante.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: "var(--space-2)" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: "var(--space-2)" }} />
        </div>
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
              {datos ? `${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}${datos.filtroTexto ? " — " + datos.filtroTexto : ""}` : "Vista en pantalla"}
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
                No se encontraron incidencias en el período.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Incidencia", "Período", "Rol", "Agente", "Identificador", "Materia / Comisión / Distribución"].map(col => (
                        <th key={col} style={th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const elementos: React.ReactNode[] = []
                      let i = 0
                      while (i < datos.datos.length) {
                        const primero = datos.datos[i]
                        const tramos  = datos.datos.slice(i, i + primero.totalTramos)
                        const esHija  = !primero.esRaiz && !!primero.incidenciaPadreId
                        const rowSpanIncidencia = 1 + tramos.length + (esHija ? 1 : 0)

                        const periodoDesde = tramos.reduce((min, t) => t.fechaDesde < min ? t.fechaDesde : min, tramos[0].fechaDesde)
                        const periodoHasta = tramos.reduce((max, t) => t.fechaHasta > max ? t.fechaHasta : max, tramos[0].fechaHasta)

                        const etiquetaTitular   = primero.esRaiz ? "TITULAR"   : "REEMPLAZA A"
                        const etiquetaReemplazo = primero.esRaiz ? "REEMPLAZO" : "NUEVO REEMPLAZO"

                        elementos.push(
                          <tr key={`${primero.incidenciaId}-titulo`} style={{ background: "var(--color-surface-raised)" }}>
                            <td style={{ ...td, fontWeight: "var(--font-medium)", color: "var(--color-accent)" }} rowSpan={rowSpanIncidencia}>
                              #{primero.incidenciaId}
                            </td>
                            <td style={td}>
                              {formatFecha(periodoDesde)} —<br />{formatFecha(periodoHasta)}
                            </td>
                            <td style={{ ...tdRol, color: "#1e3a5f" }}>{etiquetaTitular}</td>
                            <td style={td}>{primero.titularNombre} (DNI {primero.titularDNI})</td>
                            <td style={td}>{primero.identificador}</td>
                            <td style={td}>{[primero.materia, primero.comision].filter(Boolean).join(" / ") || "-"}</td>
                          </tr>
                        )

                        tramos.forEach((f, idx) => {
                          elementos.push(
                            <tr key={`${f.incidenciaId}-tramo-${idx}`}>
                              <td style={td}>
                                {formatFecha(f.fechaDesde)} —<br />{formatFecha(f.fechaHasta)}
                              </td>
                              <td style={{ ...tdRol, color: "#92400e" }}>{etiquetaReemplazo}</td>
                              <td style={{ ...td, color: f.reemplazante ? undefined : "var(--color-text-hint)", fontStyle: f.reemplazante ? undefined : "italic" }}>
                                {f.reemplazante ? `${f.reemplazante.nombre} (DNI ${f.reemplazante.documento})` : "Sin reemplazo asignado"}
                              </td>
                              <td style={td}>{f.identificador}</td>
                              <td style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{f.distribucion || "-"}</td>
                            </tr>
                          )
                        })

                        if (esHija) {
                          elementos.push(
                            <tr key={`${primero.incidenciaId}-cadena`}>
                              <td style={td}></td>
                              <td colSpan={4} style={{ ...td, fontSize: "var(--text-xs)", color: "var(--color-text-hint)", fontStyle: "italic" }}>
                                ↳ Cadena: incidencia #{primero.incidenciaPadreId}
                              </td>
                            </tr>
                          )
                        }

                        i += primero.totalTramos
                      }
                      return elementos
                    })()}
                  </tbody>
                </table>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginTop: "var(--space-3)" }}>
                  Total de incidencias: {new Set(datos.datos.map(f => f.incidenciaId)).size}  |  Tramos con reemplazo: {datos.datos.filter(f => f.reemplazante).length}  |  Tramos sin cobertura: {datos.datos.filter(f => !f.reemplazante).length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}