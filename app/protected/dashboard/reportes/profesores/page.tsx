"use client"
import { useState } from "react"
import { useDescargarPDF } from "@/app/hooks/useDescargarPDF"
import { useVistaReporte } from "@/app/hooks/useVistaReporte"

type Filtro = "todos" | "planta" | "suplentes"

type AsignacionProfesor = {
  identificador: string
  materia:       string | null
  comision:      string | null
  turno:         string
}
type ReemplazoActivo = AsignacionProfesor & {
  fechaDesde: string | null
  fechaHasta: string | null
}
type FilaProfesor = {
  id:        number
  apellido:  string
  nombre:    string
  documento: string
  email:     string | null
  telefono:  string | null
  esPlanta:    boolean
  esSuplente:  boolean
  asignaciones:      AsignacionProfesor[]
  reemplazosActivos: ReemplazoActivo[]
}
function formatFecha(f: string | null): string {
  if (!f) return "?"
  const [, mes, dia] = f.split("-")
  return `${dia}/${mes}`
}

type VistaProfesores = { datos: FilaProfesor[]; filtro: Filtro }

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

export default function ReporteProfesoresPage() {
  const { descargar, descargando, error: errorDescarga } = useDescargarPDF()
  const { datos, visible, cargando, error: errorVista, verEnPantalla, cerrarVista } = useVistaReporte<VistaProfesores>()
  const [filtro, setFiltro] = useState<Filtro>("todos")

  const opciones: { value: Filtro; label: string }[] = [
    { value: "todos",      label: "Todos los profesores" },
    { value: "planta",     label: "Solo planta (con asignación titular)" },
    { value: "suplentes",  label: "Solo suplentes (con reemplazos activos)" },
  ]

  const armarUrl = () => `/api/reportes/profesores?filtro=${filtro}`

  const handleDescargar = () => descargar(armarUrl())
  const handleVer        = () => verEnPantalla(armarUrl())

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>Listado de profesores</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Consultá en pantalla o descargá un PDF, filtrando por quienes tienen asignación de planta o solo hacen reemplazos.
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", marginBottom: "var(--space-1)" }}>Filtro</label>
          <select value={filtro} onChange={e => setFiltro(e.target.value as Filtro)} style={{ padding: "var(--space-2)" }}>
            {opciones.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
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
              {datos ? opciones.find(o => o.value === datos.filtro)?.label : "Vista en pantalla"}
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
                Sin resultados.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Apellido, Nombre", "DNI", "Email", "Teléfono", "Tipo", "Asignaciones", "Reemplaza en"].map(col => (
                        <th key={col} style={th}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.datos.map(p => (
                      <tr key={p.id}>
                        <td style={td}>{p.apellido}, {p.nombre}</td>
                        <td style={td}>{p.documento}</td>
                        <td style={td}>{p.email ?? "-"}</td>
                        <td style={td}>{p.telefono ?? "-"}</td>
                        <td style={{
                          ...td,
                          color: p.esPlanta ? "var(--color-success-text, #16a34a)" : p.esSuplente ? "#d97706" : "var(--color-text-hint)",
                          fontWeight: "var(--font-medium)",
                        }}>
                          {p.esPlanta ? "Planta" : p.esSuplente ? "Suplente" : "Sin asignación"}
                        </td>
                        <td style={td}>
                          {p.asignaciones.length === 0
                            ? "—"
                            : p.asignaciones.map((a, i) => (
                                <div key={i} style={{ fontSize: "var(--text-xs)" }}>
                                  {a.identificador}{a.materia ? ` · ${a.materia}` : ""}
                                </div>
                              ))
                          }
                        </td>
                        <td style={td}>
                          {p.reemplazosActivos.length === 0
                            ? "—"
                            : p.reemplazosActivos.map((a, i) => (
                                <div key={i} style={{ fontSize: "var(--text-xs)" }}>
                                  {a.identificador}{a.materia ? ` · ${a.materia}` : ""}
                                  <span style={{ color: "var(--color-text-hint)" }}>
                                    {" "}({formatFecha(a.fechaDesde)} - {formatFecha(a.fechaHasta)})
                                  </span>
                                </div>
                              ))
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginTop: "var(--space-3)" }}>
                  Total: {datos.datos.length}  |  Planta: {datos.datos.filter(p => p.esPlanta).length}  |  Suplentes: {datos.datos.filter(p => p.esSuplente).length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
