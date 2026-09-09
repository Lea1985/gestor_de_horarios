"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"

type Agente = { id: number; nombre: string; apellido: string; documento: string }
type PeriodoOperativo = { id: number; nombre: string; fecha_desde: string; fecha_hasta: string; estado: string }

type DetalleDia = {
  fecha:               string
  estado:              "trabajado" | "reemplazado" | "sin_cobertura" | "feriado"
  incidenciaId:         number | null
  codigarioItemCodigo: string | null
  codigarioItemNombre: string | null
  porcentajePagado:    number
}
type FilaResumen = {
  agenteId:        number
  agenteNombre:    string
  agenteDocumento: string
  totalDias:       number
  diasComputables: number
}
type VistaJornadas =
  | {
      modo:            "detalle"
      agenteId:        number
      periodo:         { desde: string; hasta: string }
      totalDias:       number
      diasComputables: number
      detalle:         DetalleDia[]
    }
  | {
      modo:    "resumen"
      periodo: { desde: string; hasta: string }
      resumen: FilaResumen[]
    }

type ModoPeriodo = "mes" | "periodoOperativo" | "rango"

const ETIQUETA_ESTADO: Record<string, string> = {
  trabajado:     "Trabajado",
  reemplazado:   "Con reemplazo",
  sin_cobertura: "Sin cobertura",
  feriado:       "Feriado",
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

// Separador ";" y BOM UTF-8: pensado para abrirse en Excel con configuración
// regional Argentina, mismo criterio que modulos-computables.
function escaparCSV(valor: string | number): string {
  const s = String(valor)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function datosACSV(datos: VistaJornadas): string {
  const filas: (string | number)[][] = datos.modo === "detalle"
    ? [
        ["Fecha", "Estado", "Incidencia", "% Pagado"],
        ...datos.detalle.map(d => [
          formatFecha(d.fecha),
          ETIQUETA_ESTADO[d.estado] ?? d.estado,
          d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "",
          d.porcentajePagado,
        ]),
      ]
    : [
        ["Agente", "DNI", "Total de días", "Días computables"],
        ...datos.resumen.map(f => [f.agenteNombre, f.agenteDocumento, f.totalDias, f.diasComputables]),
      ]
  return filas.map(fila => fila.map(escaparCSV).join(";")).join("\n")
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
const botonSecundario: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)", background: "var(--color-surface)", color: "var(--color-text-primary)",
  border: "1px solid var(--color-border-strong)", borderRadius: "var(--radius-md)", cursor: "pointer",
}

export default function ReporteJornadasPage() {
  const { authHeaders } = useAuth()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaJornadas>()
  const { descargar, descargando, error: errorDescarga } = useDescargarPDF()

  const [agentes, setAgentes] = useState<Agente[]>([])
  const [periodos, setPeriodos] = useState<PeriodoOperativo[]>([])
  const [loadingFiltros, setLoadingFiltros] = useState(true)
  const fetchedRef = useRef(false)

  const [agenteId, setAgenteId] = useState("")
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>("mes")
  const [mesAnio, setMesAnio] = useState("")
  const [periodoOperativoId, setPeriodoOperativoId] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [filtrosCalculados, setFiltrosCalculados] = useState<string | null>(null)

  useEffect(() => {
    if (fetchedRef.current) return
    const token = authHeaders?.Authorization
    if (!token || token === "Bearer ") return
    const fetchFiltros = async () => {
      try {
        setLoadingFiltros(true)
        const [resAgentes, resPeriodos] = await Promise.all([
          fetch("/api/agentes", { headers: authHeaders }),
          fetch("/api/periodos-operativos", { headers: authHeaders }),
        ])
        const dataAgentes  = await resAgentes.json()
        const dataPeriodos = await resPeriodos.json()
        setAgentes(Array.isArray(dataAgentes) ? dataAgentes : dataAgentes?.data ?? [])
        setPeriodos(Array.isArray(dataPeriodos) ? dataPeriodos : dataPeriodos?.data ?? [])
        fetchedRef.current = true
      } catch {
        setAgentes([])
        setPeriodos([])
      } finally {
        setLoadingFiltros(false)
      }
    }
    fetchFiltros()
  }, [authHeaders?.Authorization])

  const armarUrl = (): string | null => {
    // agenteId vacío => modo resumen (Todos).
    const params = new URLSearchParams()
    if (agenteId) params.set("agenteId", agenteId)
    if (modoPeriodo === "mes") {
      if (!mesAnio) { setErrorForm("Indicá el mes"); return null }
      const [anio, mes] = mesAnio.split("-")
      params.set("mes", String(Number(mes)))
      params.set("anio", anio)
    } else if (modoPeriodo === "periodoOperativo") {
      if (!periodoOperativoId) { setErrorForm("Seleccioná un período operativo"); return null }
      params.set("periodoOperativoId", periodoOperativoId)
    } else {
      if (!fechaDesde || !fechaHasta) { setErrorForm("Indicá el rango de fechas"); return null }
      params.set("desde", fechaDesde)
      params.set("hasta", fechaHasta)
    }
    setErrorForm(null)
    return `/api/reportes/jornadas?${params.toString()}`
  }

  const clavesFiltros = () =>
    JSON.stringify({ agenteId, modoPeriodo, mesAnio, periodoOperativoId, fechaDesde, fechaHasta })

  const handleVer = () => {
    const url = armarUrl()
    if (url) {
      verEnPantalla(url)
      setFiltrosCalculados(clavesFiltros())
    }
  }

  const filtrosDesactualizados = filtrosCalculados !== null && filtrosCalculados !== clavesFiltros()

  const handleDescargarPDF = () => {
    const url = armarUrl()
    if (!url) return
    descargar(`${url}&formato=pdf`, agenteId ? "jornadas.pdf" : "jornadas_todos.pdf")
  }

  const handleDescargarCSV = () => {
    if (!datos) return
    const csv = "\uFEFF" + datosACSV(datos)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const nombreArchivo = datos.modo === "detalle" ? "jornadas.csv" : "jornadas_todos.csv"
    const link = document.createElement("a")
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Jornadas (cargos jornalizados)</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Calculá los días trabajados de un agente con cargo jornalizado (preceptor, secretario, director) en un
          período: los días trabajados y los feriados pagan 100%, los días sin cobertura o cubiertos por un
          suplente pagan el porcentaje definido en el codigario de la incidencia asociada.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Agente</label>
          <select
            value={agenteId}
            onChange={e => setAgenteId(e.target.value)}
            style={{ padding: "var(--space-2)" }}
            disabled={loadingFiltros}
          >
            <option value="">{loadingFiltros ? "Cargando..." : "Todos"}</option>
            {!loadingFiltros && agentes.map(a => (
              <option key={a.id} value={a.id}>{a.apellido}, {a.nombre} (DNI {a.documento})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Período</label>
          <select
            value={modoPeriodo}
            onChange={e => setModoPeriodo(e.target.value as ModoPeriodo)}
            style={{ padding: "var(--space-2)" }}
          >
            <option value="mes">Mes calendario</option>
            <option value="periodoOperativo">Período operativo</option>
            <option value="rango">Rango personalizado</option>
          </select>
        </div>

        {modoPeriodo === "mes" && (
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Mes</label>
            <input type="month" value={mesAnio} onChange={e => setMesAnio(e.target.value)} style={{ padding: "var(--space-2)" }} />
          </div>
        )}

        {modoPeriodo === "periodoOperativo" && (
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Período operativo</label>
            <select
              value={periodoOperativoId}
              onChange={e => setPeriodoOperativoId(e.target.value)}
              style={{ padding: "var(--space-2)" }}
              disabled={loadingFiltros}
            >
              <option value="">{loadingFiltros ? "Cargando..." : "Seleccionar"}</option>
              {!loadingFiltros && periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({formatFecha(p.fecha_desde)} — {formatFecha(p.fecha_hasta)})</option>
              ))}
            </select>
          </div>
        )}

        {modoPeriodo === "rango" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: "var(--space-2)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: "var(--space-2)" }} />
            </div>
          </>
        )}

        <button
          onClick={handleVer}
          disabled={cargando}
          style={{ padding: "var(--space-2) var(--space-4)", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.6 : 1 }}
        >
          {cargando ? "Calculando..." : "Calcular"}
        </button>
        <button
          onClick={handleDescargarPDF}
          disabled={descargando}
          style={{ ...botonSecundario, cursor: descargando ? "not-allowed" : "pointer", opacity: descargando ? 0.6 : 1 }}
        >
          {descargando ? "Generando..." : "Descargar PDF"}
        </button>
      </div>

      {errorForm && (
        <div style={{ background: "var(--color-error-bg)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
          {errorForm}
        </div>
      )}
      {errorDescarga && (
        <div style={{ background: "var(--color-error-bg)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
          {errorDescarga}
        </div>
      )}

      {visible && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              {datos ? `${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}` : "Resultado"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              {datos && (
                <button
                  onClick={handleDescargarCSV}
                  disabled={filtrosDesactualizados}
                  title={filtrosDesactualizados ? "Los filtros cambiaron desde el último cálculo — volvé a calcular para descargar el CSV actualizado" : undefined}
                  style={{ background: "none", border: "none", cursor: filtrosDesactualizados ? "not-allowed" : "pointer", color: filtrosDesactualizados ? "var(--color-text-hint)" : "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}
                >
                  {filtrosDesactualizados ? "CSV desactualizado — recalculá" : "Descargar CSV"}
                </button>
              )}
              <button
                onClick={() => { cerrarVista(); setFiltrosCalculados(null) }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-hint)", fontSize: "var(--text-base)", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ padding: "var(--space-4)" }}>
            {cargando ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                Calculando...
              </div>
            ) : errorVista ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                {errorVista}
              </div>
            ) : !datos ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                No hay datos para el período seleccionado.
              </div>
            ) : datos.modo === "detalle" ? (
              datos.detalle.length === 0 ? (
                <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                  No hay jornadas para este agente en el período seleccionado.
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Fecha", "Estado", "Incidencia", "% Pagado"].map(col => (
                          <th key={col} style={th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datos.detalle.map(d => (
                        <tr key={d.fecha}>
                          <td style={td}>{formatFecha(d.fecha)}</td>
                          <td style={td}>{ETIQUETA_ESTADO[d.estado] ?? d.estado}</td>
                          <td style={{ ...td, color: d.incidenciaId ? undefined : "var(--color-text-hint)" }}>
                            {d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "—"}
                          </td>
                          <td style={{ ...td, fontWeight: "var(--font-medium)", color: d.porcentajePagado === 0 ? "var(--color-error)" : undefined }}>
                            {d.porcentajePagado}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", marginTop: "var(--space-4)", display: "flex", gap: "var(--space-4)", fontWeight: "var(--font-medium)" }}>
                    <span>Total de días: {datos.totalDias}</span>
                    <span>Días computables: {datos.diasComputables}</span>
                  </div>
                </>
              )
            ) : datos.resumen.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                No hay agentes con cargo jornalizado en el período seleccionado.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Agente", "DNI", "Total de días", "Días computables"].map(col => (
                        <th key={col} style={th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.resumen.map(f => (
                      <tr key={f.agenteId}>
                        <td style={td}>{f.agenteNombre}</td>
                        <td style={td}>{f.agenteDocumento}</td>
                        <td style={td}>{f.totalDias}</td>
                        <td style={{ ...td, fontWeight: "var(--font-medium)" }}>{f.diasComputables}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", marginTop: "var(--space-4)", fontWeight: "var(--font-medium)" }}>
                  Total de agentes: {datos.resumen.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}