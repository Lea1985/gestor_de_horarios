// app/protected/dashboard/page.tsx
"use client"

import { useCallback, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { useRouter } from "next/navigation"
import { TimelineCoberturaChart } from "@/app/ui/components/dashboard/TimelineCoberturaChart"
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview"
import { RankingsBlock } from "@/features/dashboard/components/RankingsBlock"
import { CoberturaPorComision } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"
import { useCoberturaPorComision } from "@/features/dashboard/hooks/useCoberturaPorComision"
import { MapaCalorSemanal } from "@/features/dashboard/components/MapaCalorSemanal"
import { ProximosVencimientos } from "@/features/dashboard/components/ProximosVencimientos"
import { AvisoPeriodoOperativo } from "@/features/periodosOperativos"

const MAX_COMISIONES = 3

const VALOR_VACIO = "—"

// ─── Estilos de tabla reutilizables ────────────────────────────────────────
const th: React.CSSProperties = {
  textAlign: "left", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
  textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-secondary)",
  padding: "8px 10px", borderBottom: "1px solid var(--color-border-strong)",
  background: "var(--color-surface-raised)", position: "sticky", top: 0,
}
const td: React.CSSProperties = {
  padding: "8px 10px", fontSize: "var(--text-xs)", color: "var(--color-text-primary)",
  borderBottom: "1px solid var(--color-border)", verticalAlign: "middle",
}
const panelTabla: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
}
const cuerpoScroll: React.CSSProperties = {
  maxHeight: "230px",
  overflowY: "auto",
}

// ─── Helpers ────────────────────────────────────────────────────────────────
type NivelRiesgo = "ok" | "medio" | "alto"

/** Extrae un número de un MetricValue (number | string) de forma segura */
function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return v
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? undefined : n }
  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularRiesgo(kpis: any): NivelRiesgo {
  if (!kpis) return "ok"

  const clasesHoy   = toNum(kpis.clasesHoy)           ?? 0
  const sinCobertura = toNum(kpis.sinCoberturaHoy)    ?? 0
  const incidencias = toNum(kpis.incidenciasActivas)  ?? 0
  const suspendidas = toNum(kpis.suspendidasHoy)      ?? 0

  // Sin clases programadas hoy → no hay riesgo real que reportar
  if (clasesHoy === 0) return "ok"

  // Con clases: el riesgo se basa en clases efectivamente sin cobertura,
  // no en coberturaPorcentaje (que sería 0 si no hay clases y confunde).
  // Una clase sin cobertura = incidencia activa sin reemplazo asignado.
  if (sinCobertura > 3 || suspendidas > 5 || incidencias > 10) return "alto"
  if (sinCobertura > 0 || suspendidas > 2 || incidencias > 4)  return "medio"
  return "ok"
}

const RIESGO_CONFIG: Record<NivelRiesgo, { label: string; color: string; bg: string; border: string; icon: string }> = {
  ok:    { label: "Bajo",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓" },
  medio: { label: "Medio",  color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "!" },
  alto:  { label: "Alto",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "⚠" },
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

/** Bloque de pendientes — acciones que requieren seguimiento */
function BloquePendientes({
  sinCobertura,
  vencenManana,
  loading,
  onNavigate,
}: {
  sinCobertura:            number
  vencenManana: number
  loading:                 boolean
  onNavigate:              (path: string) => void
}) {
  const items = [
    sinCobertura > 0 && {
      texto:  `${sinCobertura} clase${sinCobertura > 1 ? "s" : ""} sin cobertura hoy`,
      color:  "#dc2626",
      path:   "/protected/dashboard/clases",
      accion: "Resolver",
    },
    vencenManana > 0 && {
      texto:  `${vencenManana} incidencia${vencenManana > 1 ? "s" : ""} vence${vencenManana === 1 ? "" : "n"} mañana`,
      color:  "#d97706",
      path:   "/protected/dashboard/incidencias?vence=manana",
      accion: "Ver",
    },
  ].filter(Boolean) as Array<{ texto: string; color: string; path: string; accion: string }>

  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      padding: "12px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 13 }}>📋</span>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
          Pendientes hoy
        </span>
      </div>
      {loading ? (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: "var(--text-xs)", color: "#16a34a" }}>Sin pendientes ✓</div>
      ) : (
        items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)" }}>{item.texto}</span>
            </div>
            <button
              onClick={() => onNavigate(item.path)}
              style={{ background: "none", border: "none", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", color: item.color, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
            >
              {item.accion} →
            </button>
          </div>
        ))
      )}
    </div>
  )
}

/** Banda de alertas operativas — la sección con mayor impacto perceptual */
function BandaAlertas({
  sinCobertura,
  reemplazosActivos,
  kpis,
  loading,
  onNavigate,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sinCobertura: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reemplazosActivos: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kpis: any
  loading: boolean
  onNavigate: (path: string) => void
}) {
  if (loading) return null

  // Sin clases programadas → no hay alertas que mostrar
  const clasesHoy = toNum(kpis?.clasesHoy) ?? 0
  if (clasesHoy === 0) {
    return (
      <div style={{
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: "var(--radius-xl)", padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        fontSize: "var(--text-xs)", color: "var(--color-text-hint)",
      }}>
        Sin clases programadas para hoy
      </div>
    )
  }

  type Alerta = { id: string; nivel: "critica" | "advertencia" | "ok"; texto: string; accion?: string; path?: string }
  const alertas: Alerta[] = []

  const sinCob = sinCobertura.length
  const suspendidas = toNum(kpis?.suspendidasHoy)  ?? 0
  const incidencias = toNum(kpis?.incidenciasActivas) ?? 0
  // sinSuplente = clases con incidencia activa pero sin reemplazo asignado
  const sinSuplente = sinCobertura.filter((c: any) => !c.incidenciaId).length

  if (sinCob > 0)
    alertas.push({ id: "sin-cob", nivel: "critica", texto: `${sinCob} clase${sinCob > 1 ? "s" : ""} sin cobertura hoy`, accion: "Resolver", path: "/protected/dashboard/clases" })
  if (sinSuplente > 0)
    alertas.push({ id: "sin-sup", nivel: "critica", texto: `${sinSuplente} ausencia${sinSuplente > 1 ? "s" : ""} sin suplente asignado`, accion: "Asignar", path: "/protected/dashboard/incidencias/nueva" })
  if (suspendidas > 2)
    alertas.push({ id: "susp", nivel: "advertencia", texto: `${suspendidas} clases suspendidas hoy`, accion: "Ver", path: "/protected/dashboard/clases" })
  if (incidencias > 4)
    alertas.push({ id: "inc", nivel: "advertencia", texto: `${incidencias} incidencias activas acumuladas`, accion: "Revisar", path: "/protected/dashboard/incidencias" })

  if (alertas.length === 0) {
    return (
      <div style={{
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "var(--radius-xl)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontSize: "var(--text-xs)",
        color: "#16a34a",
        fontWeight: "var(--font-medium)",
      }}>
        <span style={{ fontSize: "14px" }}>✓</span>
        Operación sin alertas activas — todas las clases de hoy están cubiertas
      </div>
    )
  }

  const criticas = alertas.filter(a => a.nivel === "critica")
  const advertencias = alertas.filter(a => a.nivel === "advertencia")

  return (
    <div style={{
      background: criticas.length > 0 ? "#fef2f2" : "#fffbeb",
      border: `1px solid ${criticas.length > 0 ? "#fecaca" : "#fde68a"}`,
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      {/* Cabecera */}
      <div style={{
        padding: "10px 16px",
        borderBottom: `1px solid ${criticas.length > 0 ? "#fecaca" : "#fde68a"}`,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}>
        <span style={{ fontSize: "14px" }}>{criticas.length > 0 ? "⚠" : "!"}</span>
        <span style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--font-semibold)",
          color: criticas.length > 0 ? "#dc2626" : "#d97706",
        }}>
          {alertas.length} situación{alertas.length > 1 ? "es" : ""} requiere{alertas.length === 1 ? "" : "n"} atención
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {alertas.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                background: a.nivel === "critica" ? "#dc2626" : "#d97706",
              }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)" }}>
                {a.texto}
              </span>
            </div>
            {a.accion && a.path && (
              <button
                onClick={() => onNavigate(a.path!)}
                style={{
                  background: "none", border: "none", padding: "2px 0",
                  fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
                  color: a.nivel === "critica" ? "#dc2626" : "#d97706",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {a.accion} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** KPI principal con delta vs. ayer */
function KpiHero({
  label,
  valor,
  delta,
  meta,
  loading,
  onClick,
  colorValor,
}: {
  label: string
  valor: string
  delta?: number
  meta?: number
  loading: boolean
  onClick?: () => void
  colorValor?: string
}) {
  const deltaPositivo = (delta ?? 0) >= 0
  const deltaTexto = delta !== undefined
    ? `${deltaPositivo ? "+" : ""}${delta}% vs ayer`
    : undefined

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        cursor: onClick ? "pointer" : "default",
        flex: 1,
      }}
    >
      <div style={{
        fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
        textTransform: "uppercase", letterSpacing: "0.5px",
        color: "var(--color-text-hint)",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "28px", fontWeight: "var(--font-medium)",
        color: colorValor ?? "var(--color-text-primary)", lineHeight: 1.2,
      }}>
        {loading ? "…" : valor}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {meta !== undefined && (
          <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
            Meta {meta}%
          </span>
        )}
        {deltaTexto && !loading && (
          <span style={{
            fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
            color: deltaPositivo ? "#16a34a" : "#dc2626",
          }}>
            {deltaPositivo ? "▲" : "▼"} {deltaTexto}
          </span>
        )}
      </div>
    </div>
  )
}

/** Indicador de riesgo operativo */
function RiesgoOperativo({ nivel }: { nivel: NivelRiesgo }) {
  const cfg = RIESGO_CONFIG[nivel]
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-4) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      minWidth: "130px",
    }}>
      <div style={{
        fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
        textTransform: "uppercase", letterSpacing: "0.5px", color: cfg.color, opacity: 0.7,
      }}>
        Riesgo operativo
      </div>
      <div style={{
        fontSize: "22px", fontWeight: "var(--font-medium)", color: cfg.color, lineHeight: 1.2,
      }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: "var(--text-2xs)", color: cfg.color, opacity: 0.6 }}>
        {nivel === "ok" ? "Operación estable" : nivel === "medio" ? "Requiere seguimiento" : "Acción inmediata"}
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  const {
    kpis, sinCobertura, reemplazosActivos, timeline,
    pendientes, personalNoDocenteHoy, loading, error, dias, setDias,
  } = useDashboardOverview()



  const nivelRiesgo = calcularRiesgo(kpis)


  const cardsSecundarias = [
    { label: "Clases hoy",      value: kpis?.clasesHoy      ?? VALOR_VACIO, path: "/protected/dashboard/clases" },
    { label: "Suspendidas hoy", value: kpis?.suspendidasHoy ?? VALOR_VACIO, path: "/protected/dashboard/clases" },
  ]

  // ── Comisiones para selects (timeline + mapa de calor) ──────────────────
  const {
    data:    comisionesData,
    loading: comisionesLoading,
  } = useCoberturaPorComision(dias)

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  const { authHeaders } = useAuth()
  const [exportando, setExportando] = useState(false)

  const handleExportarPDF = useCallback(async () => {
    if (exportando) return
    setExportando(true)
    try {
      const res = await fetch("/api/reportes/dashboard", { headers: authHeaders })
      if (!res.ok) throw new Error("Error al generar el PDF")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `estado_operativo_${new Date().toISOString().split("T")[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error exportando PDF:", err)
    } finally {
      setExportando(false)
    }
  }, [authHeaders, exportando])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{
          margin: 0, fontSize: "var(--text-xl)",
          fontWeight: "var(--font-medium)", color: "var(--color-text-primary)",
        }}>
          Estado operativo institucional
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{
            fontSize: "var(--text-2xs)", color: "var(--color-text-hint)",
            fontWeight: "var(--font-medium)",
          }}>
            Los datos se actualizan automáticamente
          </span>
          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              background: exportando ? "var(--color-surface-raised)" : "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
              color: exportando ? "var(--color-text-hint)" : "var(--color-text-primary)",
              cursor: exportando ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {exportando ? (
              <>
                <span style={{ fontSize: 12 }}>⏳</span>
                Generando…
              </>
            ) : (
              <>
                <span style={{ fontSize: 12 }}>↓</span>
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error de carga ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)",
          padding: "8px 12px", borderRadius: "var(--radius-md)",
          background: "var(--color-error-bg)", border: "1px solid var(--color-error)",
          fontSize: "var(--text-xs)", color: "var(--color-error)",
        }} role="alert">
          {error}
        </div>
      )}

      {/* ── Aviso de período operativo (UX-PER-001) ─────────────────────────── */}
      <AvisoPeriodoOperativo />

      {/* ── Fila 1: Alertas | Pendientes | Riesgo ──────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 200px", gap: "var(--space-3)", alignItems: "stretch" }}>

        {/* Bloque Alertas */}
        <BandaAlertas
          sinCobertura={sinCobertura}
          reemplazosActivos={reemplazosActivos}
          kpis={kpis ?? null}
          loading={loading}
          onNavigate={router.push}
        />

        {/* Bloque Pendientes */}
        <BloquePendientes
          sinCobertura={sinCobertura.length}
          vencenManana={pendientes?.vencenManana ?? 0}
          loading={loading}
          onNavigate={router.push}
        />

        {/* Bloque Riesgo */}
        <RiesgoOperativo nivel={nivelRiesgo} />
      </div>

      {/* ── Fila 2: KPIs ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-3)" }}>
        <KpiHero
          label="Cobertura institucional hoy"
          valor={toNum(kpis?.coberturaPorcentaje) !== undefined ? `${toNum(kpis?.coberturaPorcentaje)}%` : VALOR_VACIO}
          delta={toNum(kpis?.deltaCobertura) ?? undefined}
          meta={95}
          loading={loading}
          onClick={() => router.push("/protected/dashboard/clases")}
          colorValor={(() => {
            const n = toNum(kpis?.coberturaPorcentaje)
            if (n === undefined) return undefined
            return n >= 85 ? "#16a34a" : n >= 70 ? "#d97706" : "#dc2626"
          })()}
        />
        <KpiHero
          label="Reemplazos activos"
          valor={toNum(kpis?.reemplazosActivos) !== undefined ? String(toNum(kpis?.reemplazosActivos)) : String(reemplazosActivos.length)}
          loading={loading}
          onClick={() => router.push("/protected/dashboard/clases")}
        />
        <KpiHero
          label="Clases sin cobertura"
          valor={toNum(kpis?.sinCoberturaHoy) !== undefined ? String(toNum(kpis?.sinCoberturaHoy)) : String(sinCobertura.length)}
          loading={loading}
          colorValor={sinCobertura.length > 0 ? "#dc2626" : "#16a34a"}
          onClick={() => router.push("/protected/dashboard/clases")}
        />
        <KpiHero
          label="Incidencias activas"
          valor={toNum(kpis?.incidenciasActivas) !== undefined ? String(toNum(kpis?.incidenciasActivas)) : VALOR_VACIO}
          loading={loading}
          onClick={() => router.push("/protected/dashboard/incidencias?hoy=1")}
        />
        <KpiHero
          label="Continuidad pedagógica"
          valor={toNum(kpis?.continuidadPedagogica) !== undefined ? `${toNum(kpis?.continuidadPedagogica)}%` : VALOR_VACIO}
          loading={loading}
          colorValor={(() => {
            const n = toNum(kpis?.continuidadPedagogica)
            if (n === undefined) return undefined
            return n >= 90 ? "#16a34a" : n >= 75 ? "#d97706" : "#dc2626"
          })()}
        />
      </div>

      {/* ── Tablas accionables ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

        {/* Sin cobertura hoy */}
        <div style={panelTabla}>
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Sin cobertura hoy
            </span>
            <span style={{
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
              color: sinCobertura.length > 0 ? "var(--color-error)" : "var(--color-text-hint)",
            }}>
              {sinCobertura.length}
            </span>
          </div>
          {loading ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              Cargando...
            </div>
          ) : sinCobertura.length === 0 ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              Todas las clases de hoy están cubiertas ✓
            </div>
          ) : (
            <div style={cuerpoScroll}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Unidad", "Identificador", "Materia", "Comisión", "Titular", ""].map(col => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {sinCobertura.map(c => (
                    <tr key={c.claseId}>
                      <td style={td}>{c.unidad ?? "-"}</td>
                      <td style={td}>{c.identificador ?? "-"}</td>
                      <td style={td}>{c.materia ?? "-"}</td>
                      <td style={td}>{c.comision ?? "-"}</td>
                      <td style={td}>{c.titular}</td>
                      <td style={td}>
                        {c.incidenciaId && (
                          <button
                            onClick={() => router.push(`/protected/dashboard/incidencias/${c.incidenciaId}`)}
                            style={{
                              background: "none", border: "none",
                              fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
                              color: "var(--color-accent)", cursor: "pointer", padding: 0, whiteSpace: "nowrap",
                            }}
                          >
                            Asignar →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reemplazos activos hoy */}
        <div style={panelTabla}>
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Reemplazos activos hoy
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              {reemplazosActivos.length}
            </span>
          </div>
          {loading ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              Cargando...
            </div>
          ) : reemplazosActivos.length === 0 ? (
            <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              No hay reemplazos activos hoy
            </div>
          ) : (
            <div style={cuerpoScroll}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Unidad", "Identificador", "Materia", "Comisión", "Titular", "Suplente", ""].map(col => <th key={col} style={th}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {reemplazosActivos.map(r => (
                    <tr key={r.claseId}>
                      <td style={td}>{r.unidad ?? "-"}</td>
                      <td style={td}>{r.identificador ?? "-"}</td>
                      <td style={td}>{r.materia ?? "-"}</td>
                      <td style={td}>{r.comision ?? "-"}</td>
                      <td style={td}>{r.titular}</td>
                      <td style={{ ...td, fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>{r.suplente}</td>
                      <td style={td}>
                        {r.incidenciaId && (
                          <button
                            onClick={() => router.push(`/protected/dashboard/incidencias/${r.incidenciaId}`)}
                            style={{
                              background: "none", border: "none",
                              fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
                              color: "var(--color-accent)", cursor: "pointer", padding: 0, whiteSpace: "nowrap",
                            }}
                          >
                            Ver →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Personal no docente — hoy ───────────────────────────────────────── */}
      {personalNoDocenteHoy.length > 0 && (
        <div style={panelTabla}>
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Personal no docente — hoy
            </span>
            <span style={{
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
              color: personalNoDocenteHoy.some(p => p.estado === "sin_cobertura") ? "var(--color-error)" : "var(--color-text-hint)",
            }}>
              {personalNoDocenteHoy.length}
            </span>
          </div>
          <div style={cuerpoScroll}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Agente", "Cargo", "Estado", ""].map(col => <th key={col} style={th}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {personalNoDocenteHoy.map(p => (
                  <tr key={p.asignacionId}>
                    <td style={td}>{p.agente}</td>
                    <td style={td}>{p.cargo ?? "-"}</td>
                    <td style={{
                      ...td,
                      fontWeight: "var(--font-medium)",
                      color: p.estado === "sin_cobertura" ? "var(--color-error)" : p.estado === "reemplazado" ? "var(--color-accent)" : "#16a34a",
                    }}>
                      {p.estado === "sin_cobertura" ? "Sin cobertura" : p.estado === "reemplazado" ? `Reemplazado por ${p.suplente}` : "Presente"}
                    </td>
                    <td style={td}>
                      {p.incidenciaId && (
                        <button
                          onClick={() => router.push(`/protected/dashboard/incidencias/${p.incidenciaId}`)}
                          style={{
                            background: "none", border: "none",
                            fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
                            color: "var(--color-accent)", cursor: "pointer", padding: 0, whiteSpace: "nowrap",
                          }}
                        >
                          {p.estado === "sin_cobertura" ? "Asignar →" : "Ver →"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cards secundarias ───────────────────────────────────────────────── */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)" }}>    
    {cardsSecundarias.map(({ label, value, path }) => (
          <div
            key={label}
            onClick={() => router.push(path)}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{
              fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
              textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-hint)",
            }}>
              {label}
            </span>
            <span style={{
              fontSize: "var(--text-lg)", fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)",
            }}>
              {loading ? "…" : value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Tendencia + Mapa de calor — grid 2 columnas ────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "stretch" }}>
        <TimelineCoberturaChart
          data={timeline}
          dias={dias}
          setDias={setDias}
          comisionesDisponibles={comisionesData}
          comisionesLoading={comisionesLoading}
        />
        <MapaCalorSemanal
          timelineInstitucional={timeline}
          comisiones={comisionesData}
          comisionesLoading={comisionesLoading}
        />
      </div>
{/* ── Rankings + Próximos vencimientos ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--space-4)", alignItems: "stretch" }}>
        <ProximosVencimientos
          pendientes={pendientes ?? null}
          loading={loading}
          onNavigate={router.push}
        />
        <RankingsBlock />
      </div>

    </div>
  )
}