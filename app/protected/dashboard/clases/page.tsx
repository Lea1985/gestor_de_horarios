//protected/dashboard/clases/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type CoberturaEstado = "NORMAL" | "REEMPLAZADA" | "SIN_COBERTURA" | "SUSPENDIDA"

type Clase = {
  id: number
  fecha: string
  estado: string
  causa: string
  coberturaEstado: CoberturaEstado
  unidad: { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  asignacion: {
    id: number
    identificadorEstructural: string
    materia: { nombre: string } | null
  } | null
  incidencia: { id: number; observacion: string | null; articulo: string | null } | null
  suplente: { nombre: string; apellido: string } | null
  modulo: { hora_desde: number; hora_hasta: number } | null
}

function formatHora(minutos?: number | null) {
  if (minutos == null) return "—"
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function hoyISO() {
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  return hoy.toISOString().slice(0, 10)
}

// UX-CLS-002/UX-CLS-004: la Causa (por qué está suspendida) no se mostraba
// en ningún lado, y el badge de Estado no distinguía visualmente los casos.
// Este mapeo combina estado + causa + coberturaEstado (que el backend ya
// calcula) en un texto legible y un color -- rojo solo para lo que
// realmente requiere acción (SIN_COBERTURA), gris para lo que no.
const CAUSA_LABEL: Record<string, string> = {
  NINGUNA:             "",
  INCIDENCIA:          "incidencia",
  CALENDARIO_ESCOLAR:  "calendario escolar",
  PERIODO_OPERATIVO:   "período operativo",
  CAMBIO_DISTRIBUCION: "cambio de distribución",
  FIN_ASIGNACION:      "fin de asignación",
  MANUAL:              "manual",
}

type InfoEstado = { texto: string; bg: string; color: string }

function infoEstado(clase: Clase): InfoEstado {
  switch (clase.estado) {
    case "PROGRAMADA":
      return { texto: "Programada", bg: "#eff6ff", color: "#2563eb" }
    case "DICTADA":
      return { texto: "Dictada", bg: "#f0fdf4", color: "#16a34a" }
    case "REEMPLAZADA":
      return { texto: "Reemplazada", bg: "#eef2ff", color: "#4f46e5" }
    case "SUSPENDIDA": {
      const causaLabel = CAUSA_LABEL[clase.causa] ?? clase.causa.toLowerCase()
      if (clase.coberturaEstado === "SIN_COBERTURA") {
        return { texto: causaLabel ? `Sin cobertura (${causaLabel})` : "Sin cobertura", bg: "#fef2f2", color: "#dc2626" }
      }
      return { texto: causaLabel ? `Suspendida (${causaLabel})` : "Suspendida", bg: "#f3f4f6", color: "#6b7280" }
    }
    default:
      return { texto: clase.estado, bg: "#f3f4f6", color: "#6b7280" }
  }
}

const LEYENDA: { color: string; texto: string }[] = [
  { color: "#2563eb", texto: "Programada" },
  { color: "#16a34a", texto: "Dictada" },
  { color: "#4f46e5", texto: "Reemplazada" },
  { color: "#dc2626", texto: "Sin cobertura — requiere acción" },
  { color: "#6b7280", texto: "Suspendida — sin acción (feriado, período, etc.)" },
]

const inputStyle = {
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding:      "6px 10px",
  fontSize:     "var(--text-sm)",
  color:        "var(--color-text-primary)",
}

export default function ClasesPage() {
  const router = useRouter()
  const { authHeaders } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clases, setClases] = useState<Clase[]>([])

  // UX-CLS-001: rango de fechas, default "hoy" en ambos extremos -- el
  // comportamiento de siempre sigue siendo el default al entrar.
  const [desde, setDesde] = useState(hoyISO())
  const [hasta, setHasta] = useState(hoyISO())
  const esHoy = desde === hoyISO() && hasta === hoyISO()

  async function cargarClases() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ desde, hasta })
      const res = await fetch(`/api/dashboard/clases-hoy?${params}`, {
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error cargando clases")
      }
      const data = await res.json()
      setClases(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setClases([])
      setError(err instanceof Error ? err.message : "Error cargando clases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") {
      cargarClases()
    }
  }, [authHeaders.Authorization, desde, hasta])

  const metricas = useMemo(() => {
    const total = clases.length
    let reemplazadas = 0
    let suspendidas = 0
    let sinCobertura = 0
    for (const c of clases) {
      switch (c.coberturaEstado) {
        case "REEMPLAZADA":   reemplazadas++;  break
        case "SUSPENDIDA":    suspendidas++;   break
        case "SIN_COBERTURA": sinCobertura++;  break
      }
    }
    return { total, reemplazadas, suspendidas, sinCobertura }
  }, [clases])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "var(--space-3)" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)" }}>
            Operación diaria de clases
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
            Vista operativa institucional {esHoy ? "del día" : "del rango seleccionado"}
          </p>
        </div>
        {/* Filtro de fecha/rango (UX-CLS-001) */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <label style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
          <label style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
          {!esHoy && (
            <button
              onClick={() => { setDesde(hoyISO()); setHasta(hoyISO()) }}
              style={{ padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", cursor: "pointer" }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
          {error}
        </div>
      )}

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        {[
          { label: "Clases",             value: error ? "—" : metricas.total,        color: undefined as string | undefined },
          { label: "Reemplazos activos", value: error ? "—" : metricas.reemplazadas, color: undefined as string | undefined },
          { label: "Suspendidas",        value: error ? "—" : metricas.suspendidas,  color: undefined as string | undefined },
          { label: "Sin cobertura",      value: error ? "—" : metricas.sinCobertura, color: error ? undefined : (metricas.sinCobertura > 0 ? "#dc2626" : "#16a34a") },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", color: "var(--color-text-hint)", marginBottom: "var(--space-2)" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: card.color ?? "var(--color-text-primary)" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-raised)", textAlign: "left" }}>
                {(esHoy ? ["Hora", "Estado", "Materia", "Comisión", "Suplente", "Incidencia"] : ["Fecha", "Hora", "Estado", "Materia", "Comisión", "Suplente", "Incidencia"]).map(header => (
                  <th key={header} style={{ padding: "var(--space-3)", fontSize: "var(--text-xs)", borderBottom: "1px solid var(--color-border)" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={esHoy ? 6 : 7} style={{ padding: "var(--space-4)" }}>Cargando clases...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={esHoy ? 6 : 7} style={{ padding: "var(--space-4)", color: "var(--color-error)" }}>
                    No se pudieron cargar las clases. Revisá el error de arriba e intentá de nuevo.
                  </td>
                </tr>
              ) : clases.length === 0 ? (
                <tr><td colSpan={esHoy ? 6 : 7} style={{ padding: "var(--space-4)" }}>No hay clases para mostrar en este rango</td></tr>
              ) : (
                clases.map(clase => {
                  const info = infoEstado(clase)
                  return (
                    <tr key={clase.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {!esHoy && (
                        <td style={{ padding: "var(--space-3)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                          {new Date(clase.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })}
                        </td>
                      )}
                      <td style={{ padding: "var(--space-3)" }}>
                        {formatHora(clase.modulo?.hora_desde)} - {formatHora(clase.modulo?.hora_hasta)}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "var(--text-2xs)", background: info.bg, color: info.color, fontWeight: "var(--font-medium)", whiteSpace: "nowrap" }}>
                          {info.texto}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>{clase.asignacion?.materia?.nombre ?? "—"}</td>
                      <td style={{ padding: "var(--space-3)" }}>{clase.comision?.nombre ?? "—"}</td>
                      <td style={{ padding: "var(--space-3)" }}>
                        {clase.suplente ? `${clase.suplente.apellido}, ${clase.suplente.nombre}` : "—"}
                      </td>
                      <td style={{ padding: "var(--space-3)" }}>
                        {clase.incidencia ? (
                          <button
                            onClick={() => router.push(`/protected/dashboard/incidencias/${clase.incidencia!.id}`)}
                            style={{
                              background: "none", border: "none",
                              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
                              color: "var(--color-accent)", cursor: "pointer", padding: 0, whiteSpace: "nowrap",
                            }}
                          >
                            #{clase.incidencia.id} {clase.coberturaEstado === "SIN_COBERTURA" ? "· Asignar →" : "· Ver →"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Leyenda de estados (UX-CLS-004) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}>
          {LEYENDA.map(item => (
            <div key={item.texto} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-2xs)", color: "var(--color-text-secondary)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block" }} />
              {item.texto}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}