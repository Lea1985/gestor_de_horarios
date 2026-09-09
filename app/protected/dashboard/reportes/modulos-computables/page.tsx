"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"

type Agente = { id: number; nombre: string; apellido: string; documento: string }
type PeriodoOperativo = { id: number; nombre: string; fecha_desde: string; fecha_hasta: string; estado: string }

type DetalleClase = {
  claseId:              number
  fecha:                string
  asignacionId:         number
  incidenciaId:          number | null
  codigarioItemCodigo:  string | null
  codigarioItemNombre:  string | null
  porcentajeComputable: number
}
type FilaResumen = {
  agenteId:                number
  agenteNombre:            string
  agenteDocumento:         string
  totalClases:             number
  totalModulosComputables: number
}
type VistaModulosComputables =
  | {
      modo:                    "detalle"
      agenteId:                number
      periodo:                 { desde: string; hasta: string }
      totalClases:             number
      totalModulosComputables: number
      detalle:                 DetalleClase[]
    }
  | {
      modo:    "resumen"
      periodo: { desde: string; hasta: string }
      resumen: FilaResumen[]
    }

type ModoPeriodo = "mes" | "periodoOperativo" | "rango"

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

// Separador ";" y BOM UTF-8: pensado para abrirse en Excel con configuración
// regional Argentina (coma como separador decimal), que es el caso de uso
// real (pasarle el archivo al liquidador de sueldos).
function escaparCSV(valor: string | number): string {
  const s = String(valor)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function datosACSV(datos: VistaModulosComputables): string {
  const filas: (string | number)[][] = datos.modo === "detalle"
    ? [
        ["Fecha", "Incidencia", "% Computable"],
        ...datos.detalle.map(d => [
          formatFecha(d.fecha),
          d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "",
          d.porcentajeComputable,
        ]),
      ]
    : [
        ["Docente", "DNI", "Total de clases", "Módulos computables"],
        ...datos.resumen.map(f => [f.agenteNombre, f.agenteDocumento, f.totalClases, f.totalModulosComputables]),
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

export default function ReporteModulosComputablesPage() {
  const { authHeaders } = useAuth()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaModulosComputables>()
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
    // agenteId vacío => modo resumen (Todos), no es un error de formulario.
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
    return `/api/reportes/modulos-computables?${params.toString()}`
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
    descargar(`${url}&formato=pdf`, agenteId ? "modulos_computables.pdf" : "modulos_computables_todos.pdf")
  }

  const handleDescargarCSV = () => {
    if (!datos) return
    const csv = "﻿" + datosACSV(datos)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const nombreArchivo = datos.modo === "detalle" ? "modulos_computables.csv" : "modulos_computables_todos.csv"
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
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Módulos computables</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Calculá los módulos computables de un docente (o de todos) en un período: las clases sin incidencia
          computan 100%, las que tienen incidencia computan el porcentaje definido en el codigario. Podés
          consultarlo en pantalla, o descargarlo directamente en PDF o CSV.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Docente</label>
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
          style={{ padding: "var(--space-2) var(--space-4)", background: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.6 : 1 }}
        >
          {cargando ? "Cargando..." : "Ver en pantalla"}
        </button>
        <button
          onClick={handleDescargarPDF}
          disabled={descargando}
          style={{ padding: "var(--space-2) var(--space-4)", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: descargando ? "not-allowed" : "pointer", opacity: descargando ? 0.6 : 1 }}
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
                Cargando...
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
                  No hay clases para este docente en el período seleccionado.
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Fecha", "Incidencia", "% Computable"].map(col => (
                          <th key={col} style={th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datos.detalle.map(d => (
                        <tr key={d.claseId}>
                          <td style={td}>{formatFecha(d.fecha)}</td>
                          <td style={{ ...td, color: d.incidenciaId ? undefined : "var(--color-text-hint)" }}>
                            {d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "—"}
                          </td>
                          <td style={{ ...td, fontWeight: "var(--font-medium)", color: d.porcentajeComputable === 0 ? "var(--color-error)" : undefined }}>
                            {d.porcentajeComputable}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", marginTop: "var(--space-4)", display: "flex", gap: "var(--space-4)", fontWeight: "var(--font-medium)" }}>
                    <span>Total de clases: {datos.totalClases}</span>
                    <span>Módulos computables: {datos.totalModulosComputables}</span>
                  </div>
                </>
              )
            ) : datos.resumen.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
                No hay docentes con titularidad vigente en el período seleccionado.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Docente", "DNI", "Total de clases", "Módulos computables"].map(col => (
                        <th key={col} style={th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.resumen.map(f => (
                      <tr key={f.agenteId}>
                        <td style={td}>{f.agenteNombre}</td>
                        <td style={td}>{f.agenteDocumento}</td>
                        <td style={td}>{f.totalClases}</td>
                        <td style={{ ...td, fontWeight: "var(--font-medium)" }}>{f.totalModulosComputables}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", marginTop: "var(--space-4)", fontWeight: "var(--font-medium)" }}>
                  Total de docentes: {datos.resumen.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
