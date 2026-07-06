// features/dashboard/components/MapaCalorSemanal.tsx
"use client"

import { useMemo, useState } from "react"
import { CoberturaPorComision, TimelineComisionItem } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"
import { TimelineItem } from "../types"

// ── Tipos ─────────────────────────────────────────────────────────────────────

type DatoHeatmap = {
  semana:    number   // 0 = más antigua, N = más reciente
  dia:       number   // 0=Lun ... 5=Sab
  fecha:     string
  pct:       number | null
  total:     number
}

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

// Colores del mapa — misma semántica que el resto del dashboard
function colorCelda(pct: number | null): { bg: string; text: string; border: string } {
  if (pct === null) return { bg: "#F9FAFB", text: "#D1D5DB", border: "#F3F4F6" }
  if (pct >= 90)    return { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" }
  if (pct >= 75)    return { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" }
  if (pct >= 60)    return { bg: "#FEF9C3", text: "#A16207", border: "#FDE68A" }
  if (pct >= 40)    return { bg: "#FFEDD5", text: "#C2410C", border: "#FED7AA" }
  return                  { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ISO day: 0=lunes, 5=sábado (ignoramos domingo)
function diaSemana(fechaStr: string): number {
  const d = new Date(fechaStr + "T12:00:00")
  const iso = d.getDay() // 0=domingo, 1=lunes...
  return iso === 0 ? -1 : iso - 1 // -1 = domingo (filtrado)
}

function lunes(fechaStr: string): string {
  const d = new Date(fechaStr + "T12:00:00")
  const iso = d.getDay()
  const diff = iso === 0 ? -6 : 1 - iso
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]
}

function formatSemana(lunesStr: string): string {
  const d = new Date(lunesStr + "T12:00:00")
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

function buildHeatmapData(
  items: Array<{ fecha: string; coberturaPorcentaje: number; total: number }>
): { semanas: string[]; celdas: DatoHeatmap[] } {
  // Agrupar por semana (lunes de esa semana como key)
  const porSemana = new Map<string, Map<number, { pct: number; total: number; fecha: string }>>()

  for (const item of items) {
    const dia = diaSemana(item.fecha)
    if (dia < 0) continue // ignorar domingos
    const lun = lunes(item.fecha)
    if (!porSemana.has(lun)) porSemana.set(lun, new Map())
    porSemana.get(lun)!.set(dia, {
      pct:   item.coberturaPorcentaje,
      total: item.total,
      fecha: item.fecha,
    })
  }

  const semanas = Array.from(porSemana.keys()).sort()
  const celdas: DatoHeatmap[] = []

  semanas.forEach((lun, semIdx) => {
    const diasSemana = porSemana.get(lun)!
    for (let dia = 0; dia <= 5; dia++) {
      const d = diasSemana.get(dia)
      celdas.push({
        semana: semIdx,
        dia,
        fecha:  d?.fecha ?? "",
        pct:    d?.pct ?? null,
        total:  d?.total ?? 0,
      })
    }
  })

  return { semanas, celdas }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ celda, visible }: { celda: DatoHeatmap | null; visible: boolean }) {
  if (!visible || !celda || !celda.fecha) return null
  const colors = colorCelda(celda.pct)
  return (
    <div style={{
      position: "absolute", zIndex: 10, pointerEvents: "none",
      background: "#FFFFFF", border: "1px solid #E5E7EB",
      borderRadius: 8, padding: "8px 12px",
      fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      minWidth: 130, whiteSpace: "nowrap",
    }}>
      <div style={{ fontWeight: 600, color: "#1A1A1A", marginBottom: 4, fontSize: 12 }}>
        {new Date(celda.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span style={{ color: "#6B7280" }}>Cobertura</span>
        <span style={{ color: colors.text, fontWeight: 600 }}>
          {celda.pct !== null ? `${celda.pct}%` : "Sin datos"}
        </span>
      </div>
      {celda.total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#6B7280" }}>Clases</span>
          <span style={{ color: "#1A1A1A" }}>{celda.total}</span>
        </div>
      )}
    </div>
  )
}

// ── Select de comisión ────────────────────────────────────────────────────────

interface SelectComisionProps {
  comisiones:   CoberturaPorComision[]
  valor:        number | null  // null = institución
  onChange:     (id: number | null) => void
  loading:      boolean
}

function SelectComision({ comisiones, valor, onChange, loading }: SelectComisionProps) {
  return (
    <select
      value={valor ?? ""}
      onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
      disabled={loading}
      style={{
        padding: "4px 10px",
        border: "1px solid #E5E7EB",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-xs)",
        color: "var(--color-text-primary)",
        background: "var(--color-surface)",
        cursor: loading ? "not-allowed" : "pointer",
        outline: "none",
        minWidth: 160,
      }}
    >
      <option value="">Institución (todo)</option>
      {comisiones.map(c => (
        <option key={c.comisionId} value={c.comisionId}>
          {c.nombre} · {c.curso}
        </option>
      ))}
    </select>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  // Timeline institucional (ya viene de useDashboardOverview)
  timelineInstitucional: TimelineItem[]
  // Comisiones disponibles para el select
  comisiones:    CoberturaPorComision[]
  comisionesLoading?: boolean
}

export function MapaCalorSemanal({ timelineInstitucional, comisiones, comisionesLoading = false }: Props) {
  const [comisionId, setComisionId] = useState<number | null>(null)
  const [tooltipCelda, setTooltipCelda] = useState<DatoHeatmap | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Seleccionar fuente de datos según el select
  const itemsActivos = useMemo((): Array<{ fecha: string; coberturaPorcentaje: number; total: number }> => {
    if (comisionId === null) {
      return timelineInstitucional.map(d => ({
        fecha:               d.fecha,
        coberturaPorcentaje: d.coberturaPorcentaje,
        total:               d.total,
      }))
    }
    const comision = comisiones.find(c => c.comisionId === comisionId)
    if (!comision) return []
    return comision.timeline.map(d => ({
      fecha:               d.fecha,
      coberturaPorcentaje: d.coberturaPorcentaje,
      total:               d.total,
    }))
  }, [comisionId, timelineInstitucional, comisiones])

  const { semanas, celdas } = useMemo(
    () => buildHeatmapData(itemsActivos),
    [itemsActivos]
  )

  const promedio = useMemo(() => {
    const validos = celdas.filter(c => c.pct !== null)
    if (validos.length === 0) return null
    return Math.round(validos.reduce((a, c) => a + c.pct!, 0) / validos.length)
  }, [celdas])

  const CELDA_W = 36
  const CELDA_H = 28
  const GAP     = 3
  const LABEL_W = 32

  if (timelineInstitucional.length === 0) return null

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-4) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      height: "100%",
      boxSizing: "border-box",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "#1A1A1A" }}>
            Cobertura semanal
          </p>
          {promedio !== null && (
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "#6B7280" }}>
              Promedio del período:{" "}
              <span style={{ color: colorCelda(promedio).text, fontWeight: 500 }}>
                {promedio}%
              </span>
              {comisionId !== null && (
                <span style={{ marginLeft: 6, color: "#9CA3AF" }}>
                  · {comisiones.find(c => c.comisionId === comisionId)?.nombre}
                </span>
              )}
            </p>
          )}
        </div>

        <SelectComision
          comisiones={comisiones}
          valor={comisionId}
          onChange={setComisionId}
          loading={comisionesLoading}
        />
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", display: "flex", justifyContent: "center", flexGrow: 1, alignItems: "center" }}>
        <div style={{ position: "relative", display: "inline-block" }}>

          {/* Etiquetas de días (columnas) */}
          <div style={{
            display: "flex",
            marginLeft: LABEL_W + GAP,
            gap: GAP,
            marginBottom: GAP,
          }}>
            {DIAS_LABEL.map(dia => (
              <div key={dia} style={{
                width: CELDA_W, textAlign: "center",
                fontSize: 10, color: "#9CA3AF", fontWeight: 500,
              }}>
                {dia}
              </div>
            ))}
          </div>

          {/* Filas de semanas */}
          {semanas.map((lun, semIdx) => (
            <div key={lun} style={{ display: "flex", alignItems: "center", gap: GAP, marginBottom: GAP }}>
              {/* Etiqueta semana */}
              <div style={{
                width: LABEL_W, textAlign: "right",
                fontSize: 9, color: "#9CA3AF",
                paddingRight: 4, flexShrink: 0,
              }}>
                {formatSemana(lun)}
              </div>

              {/* Celdas de días */}
              {[0, 1, 2, 3, 4, 5].map(dia => {
                const celda = celdas.find(c => c.semana === semIdx && c.dia === dia)
                const colors = colorCelda(celda?.pct ?? null)
                const sinDatos = !celda || celda.pct === null

                return (
                  <div
                    key={dia}
                    onMouseEnter={e => {
                      if (celda) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const parent = e.currentTarget.closest("[data-heatmap]")?.getBoundingClientRect()
                        setTooltipCelda(celda)
                        setTooltipPos({
                          x: rect.left - (parent?.left ?? 0) + CELDA_W / 2,
                          y: rect.top  - (parent?.top  ?? 0) - 4,
                        })
                        setTooltipVisible(true)
                      }
                    }}
                    onMouseLeave={() => setTooltipVisible(false)}
                    style={{
                      width:        CELDA_W,
                      height:       CELDA_H,
                      borderRadius: 6,
                      background:   colors.bg,
                      border:       `1px solid ${colors.border}`,
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                      fontSize:     9,
                      fontWeight:   sinDatos ? 400 : 600,
                      color:        colors.text,
                      cursor:       sinDatos ? "default" : "pointer",
                      transition:   "transform 0.1s",
                      flexShrink:   0,
                    }}
                    onMouseDown={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "scale(0.95)"
                    }}
                    onMouseUp={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"
                    }}
                  >
                    {sinDatos ? "·" : `${celda!.pct}%`}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Tooltip */}
          <div
            data-heatmap
            style={{ position: "absolute", top: tooltipPos.y - 70, left: tooltipPos.x - 65, pointerEvents: "none" }}
          >
            <Tooltip celda={tooltipCelda} visible={tooltipVisible} />
          </div>
        </div>
      </div>

      {/* ── Leyenda ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>Cobertura:</span>
        {[
          { label: "≥ 90%", pct: 95 },
          { label: "75–90%", pct: 80 },
          { label: "60–75%", pct: 67 },
          { label: "40–60%", pct: 50 },
          { label: "< 40%",  pct: 20 },
        ].map(({ label, pct }) => {
          const c = colorCelda(pct)
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 12, height: 12, borderRadius: 3,
                background: c.bg, border: `1px solid ${c.border}`,
              }} />
              <span style={{ fontSize: 10, color: "#6B7280" }}>{label}</span>
            </div>
          )
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#F9FAFB", border: "1px solid #F3F4F6" }} />
          <span style={{ fontSize: 10, color: "#6B7280" }}>Sin clases</span>
        </div>
      </div>
    </div>
  )
}
