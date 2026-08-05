"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"

type Agente = { id: number; nombre: string; apellido: string; documento: string }

type Distribucion = {
  version: number
  vigente: boolean
  desde:   string
  hasta:   string | null
  modulos: string
}

type IncidenciaProfesor = {
  id:          number
  fechaDesde:  string
  fechaHasta:  string
  codigo:      string
  nombre:      string
  observacion: string | null
}

type AsignacionProfesor = {
  identificador:  string
  materia:        string | null
  comision:       string | null
  turno:          string
  unidad:         string
  distribuciones: Distribucion[]
  incidencias:    IncidenciaProfesor[]
}

type ReemplazoSuplente = {
  fecha:         string
  asignacion:    string
  titularNombre: string
  titularDNI:    string
}

type DatosProfesor = {
  agente: {
    nombre:    string
    apellido:  string
    documento: string
    email:     string | null
    telefono:  string | null
    domicilio: string | null
  }
  asignaciones:           AsignacionProfesor[]
  reemplazosComoSuplente: ReemplazoSuplente[]
}

type VistaProfesor = { datos: DatosProfesor }

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

export default function ReporteProfesorPage() {
  const { authHeaders } = useAuth()
  const { descargar, descargando, error: errorDescarga, setError: setErrorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaProfesor>()

  const [agentes, setAgentes] = useState<Agente[]>([])
  const [loadingAgentes, setLoadingAgentes] = useState(true)
  const [agenteId, setAgenteId] = useState("")
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
        setAgentes(Array.isArray(data) ? data : data?.data ?? [])
        fetchedRef.current = true
      } catch {
        setAgentes([])
      } finally {
        setLoadingAgentes(false)
      }
    }
    fetchAgentes()
  }, [authHeaders?.Authorization])

  const armarUrl = () => `/api/reportes/profesor/${agenteId}`

  const handleDescargar = () => {
    if (!agenteId) {
      setErrorDescarga("Seleccioná un profesor")
      return
    }
    descargar(armarUrl())
  }

  const handleVer = () => {
    if (!agenteId) {
      setErrorDescarga("Seleccioná un profesor")
      return
    }
    verEnPantalla(armarUrl())
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Ficha de profesor</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF con los datos personales, asignaciones, distribuciones e incidencias del profesor.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Profesor</label>
          <select
            value={agenteId}
            onChange={e => setAgenteId(e.target.value)}
            style={{ padding: "var(--space-2)" }}
            disabled={loadingAgentes}
          >
            <option value="">{loadingAgentes ? "Cargando..." : "Seleccionar"}</option>
            {!loadingAgentes && agentes.map(a => (
              <option key={a.id} value={a.id}>{a.apellido}, {a.nombre} (DNI {a.documento})</option>
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
              {datos ? `${datos.datos.agente.apellido}, ${datos.datos.agente.nombre}` : "Vista en pantalla"}
            </span>
            <button
              onClick={cerrarVista}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-hint)", fontSize: "var(--text-base)", lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {cargando ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                Cargando...
              </div>
            ) : errorVista ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                {errorVista}
              </div>
            ) : !datos ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                Sin datos.
              </div>
            ) : (
              <>
                {/* Datos personales */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
                  <div><span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", fontWeight: "var(--font-medium)" }}>DNI</span><div style={{ fontSize: "var(--text-sm)" }}>{datos.datos.agente.documento}</div></div>
                  <div><span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", fontWeight: "var(--font-medium)" }}>Email</span><div style={{ fontSize: "var(--text-sm)" }}>{datos.datos.agente.email ?? "-"}</div></div>
                  <div><span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", fontWeight: "var(--font-medium)" }}>Teléfono</span><div style={{ fontSize: "var(--text-sm)" }}>{datos.datos.agente.telefono ?? "-"}</div></div>
                  <div><span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", fontWeight: "var(--font-medium)" }}>Domicilio</span><div style={{ fontSize: "var(--text-sm)" }}>{datos.datos.agente.domicilio ?? "-"}</div></div>
                </div>

                {/* Asignaciones */}
                <div>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-3)" }}>Asignaciones</h3>
                  {datos.datos.asignaciones.length === 0 ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>Sin asignaciones registradas.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                      {datos.datos.asignaciones.map((a, i) => (
                        <div key={i}>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
                            {a.identificador}{a.materia ? ` — ${a.materia}` : ""}
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
                            {[a.comision, a.turno, a.unidad].filter(Boolean).join(" — ")}
                          </div>

                          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-3)" }}>
                            <thead>
                              <tr>
                                {["Versión", "Estado", "Desde", "Hasta", "Módulos"].map(col => (
                                  <th key={col} style={th}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {a.distribuciones.length === 0 ? (
                                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--color-text-hint)" }}>Sin distribuciones</td></tr>
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

                          {a.incidencias.length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["Incidencia", "Período", "Tipo", "Observación"].map(col => (
                                    <th key={col} style={th}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {a.incidencias.map(inc => (
                                  <tr key={inc.id}>
                                    <td style={td}>#{inc.id}</td>
                                    <td style={td}>{formatFecha(inc.fechaDesde)} — {formatFecha(inc.fechaHasta)}</td>
                                    <td style={td}>{inc.codigo} — {inc.nombre}</td>
                                    <td style={td}>{inc.observacion ?? "-"}</td>
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

                {/* Reemplazos como suplente */}
                <div>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-3)" }}>Reemplazos realizados (como suplente)</h3>
                  {datos.datos.reemplazosComoSuplente.length === 0 ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>Sin reemplazos registrados.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Fecha", "Asignación cubierta", "Titular reemplazado", "DNI"].map(col => (
                            <th key={col} style={th}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {datos.datos.reemplazosComoSuplente.map((r, i) => (
                          <tr key={i}>
                            <td style={td}>{formatFecha(r.fecha)}</td>
                            <td style={td}>{r.asignacion}</td>
                            <td style={td}>{r.titularNombre}</td>
                            <td style={td}>{r.titularDNI}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
