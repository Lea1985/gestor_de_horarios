// app/ui/components/dashboard/TimelineCoberturaChart.tsx
"use client"

import React from "react"

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { CoberturaPorComision } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"

// ── Tipos ────────────────────────────────────────────────────────────────────

type TimelineItem = {
  fecha:               string
  total:               number
  normales:            number
  reemplazadas:        number
  sinCobertura:        number
  suspendidas:         number
  coberturaPorcentaje: number
}

type RangoDias = 7 | 14 | 30
const RANGOS: RangoDias[] = [7, 14, 30]

export type Props = {
  data:                   TimelineItem[]
  dias:                   RangoDias
  setDias:                (d: RangoDias) => void
  // Comisiones disponibles para el select interno
  comisionesDisponibles?: CoberturaPorComision[]
  comisionesLoading?:     boolean
}

// ── Paleta para comisiones seleccionadas ─────────────────────────────────────
// [0] = primera seleccionada, [1] = segunda, [2] = tercera
const PALETA_COMISIONES = ["#0EA5E9", "#F59E0B", "#8B5CF6"] as const

// La más problemática automática: rojo/naranja para señalar atención
const COLOR_INST_SOLO = "#1E9BB8"   // teal cuando no hay comisiones
const COLOR_INST_FONDO = "#9CA3AF"  // gris cuando hay comisiones

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-")
  return `${dia}/${mes}`
}

type MergedPoint = TimelineItem & {
  fechaCorta:    string
  institucional: number
  [key: string]: number | string // comision_0, comision_1, comision_2
}

function mergeTimelines(
  institucional: TimelineItem[],
  comisiones:    CoberturaPorComision[],
): MergedPoint[] {
  const maps = comisiones.map(c =>
    new Map((c.timeline ?? []).map(d => [d.fecha, d.coberturaPorcentaje]))
  )
  return institucional.map(d => {
    const point: MergedPoint = {
      ...d,
      fechaCorta:    formatFechaCorta(d.fecha),
      institucional: d.coberturaPorcentaje,
    }
    comisiones.forEach((_, i) => {
      point[`comision_${i}`] = maps[i].get(d.fecha) ?? (null as unknown as number)
    })
    return point
  })
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function TooltipCustom({ active, payload, label, comisiones }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as MergedPoint

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 11,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      minWidth: 170,
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 500, color: "#1A1A1A", fontSize: 12 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <TooltipRow
          label="Institución"
          value={`${d.institucional}%`}
          color={comisiones.length === 0 ? COLOR_INST_SOLO : COLOR_INST_FONDO}
          bold
        />
        {comisiones.map((c: CoberturaPorComision, i: number) => {
          const v = d[`comision_${i}`]
          if (v == null) return null
          return (
            <TooltipRow
              key={c.comisionId}
              label={c.nombre}
              value={`${v}%`}
              color={PALETA_COMISIONES[i]}
              bold
            />
          )
        })}
        <div style={{ height: 1, background: "#E5E7EB", margin: "2px 0" }} />
        <TooltipRow label="Total clases"  value={d.total}        color="#6B7280" />
        {d.suspendidas  > 0 && <TooltipRow label="Suspendidas"   value={d.suspendidas}  color="#F5A524" />}
        {d.sinCobertura > 0 && <TooltipRow label="Sin cobertura" value={d.sinCobertura} color="#E5484D" />}
      </div>
    </div>
  )
}

function TooltipRow({ label, value, color, bold }: { label: string; value: string | number; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  )
}

// ── Leyenda ───────────────────────────────────────────────────────────────────

function LeyendaLinea({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={20} height={8}>
        <line
          x1={0} y1={4} x2={20} y2={4}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? "4 3" : undefined}
        />
      </svg>
      <span style={{ fontSize: "var(--text-2xs)", color: "#6B7280" }}>{label}</span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TimelineCoberturaChart({
  data,
  dias,
  setDias,
  comisionesDisponibles = [],
  comisionesLoading = false,
}: Props) {
  const [comisionIdSelect, setComisionIdSelect] = React.useState<number | null>(null)

  const comisionSelect = comisionIdSelect !== null
    ? (comisionesDisponibles.find(c => c.comisionId === comisionIdSelect) ?? null)
    : null

  const haySeleccion = comisionIdSelect !== null

  // Comisiones a graficar: solo la del select interno
  const comisionesEfectivas: CoberturaPorComision[] = comisionSelect ? [comisionSelect] : []

  const chartData = mergeTimelines(data, comisionesEfectivas)

  const promedio = data.length > 0
    ? Math.round(data.reduce((acc, d) => acc + d.coberturaPorcentaje, 0) / data.length)
    : null

  const colorInst = haySeleccion ? COLOR_INST_FONDO : COLOR_INST_SOLO

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-4) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "#1A1A1A" }}>
            Tendencia de cobertura
          </p>
          {promedio !== null && (
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "#6B7280" }}>
              Promedio institucional:{" "}
              <span style={{ color: COLOR_INST_SOLO, fontWeight: 500 }}>{promedio}%</span>
            </p>
          )}
        </div>

        {/* Controles: select comisión + segmented días */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>

          {/* Select comisión — deshabilitado si hay selección externa */}
          {comisionesDisponibles.length > 0 && (
            <select
              value={comisionIdSelect ?? ""}
              onChange={e => {
                const id = e.target.value === "" ? null : Number(e.target.value)
                setComisionIdSelect(id)

              }}
              disabled={comisionesLoading}

              style={{
                padding: "4px 10px",
                border: "1px solid #E5E7EB",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-primary)",
                background: "var(--color-surface)",
                cursor: comisionesLoading ? "not-allowed" : "pointer",
                outline: "none",
                minWidth: 160,
              }}
            >
              <option value="">Institución (todo)</option>
              {comisionesDisponibles.map(c => (
                <option key={c.comisionId} value={c.comisionId}>
                  {c.nombre} · {c.curso}
                </option>
              ))}
            </select>
          )}

          {/* Segmented control días */}
          <div style={{
            display: "inline-flex",
            background: "#F1F4F8",
            borderRadius: "var(--radius-lg)",
            padding: 3,
            gap: 2,
          }}>
          {RANGOS.map(r => {
            const activo = dias === r
            return (
              <button
                key={r}
                onClick={() => setDias(r)}
                style={{
                  padding: "4px 12px",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  background: activo ? "#FFFFFF" : "transparent",
                  boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
                  color: activo ? "#1A1A1A" : "#6B7280",
                  fontSize: "var(--text-xs)",
                  fontWeight: activo ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}
              >
                {r}d
              </button>
            )
          })}
          </div> {/* end segmented */}
        </div> {/* end controles */}
      </div> {/* end header */}

      {/* ── Leyenda dinámica ────────────────────────────────────────────────── */}
      {(haySeleccion) && (
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", flexWrap: "wrap" }}>
          <LeyendaLinea color={COLOR_INST_FONDO} label="Institución" />
          {comisionesEfectivas.map((c, i) => (
            <LeyendaLinea
              key={c.comisionId}
              color={PALETA_COMISIONES[i]}
              label={c.nombre}
              dashed
            />
          ))}
        </div>
      )}

      {/* ── Gráfico ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 160 }}>
        {data.length === 0 ? (
          <div style={{
            height: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "var(--text-xs)", color: "#9CA3AF",
          }}>
            Sin datos para el período seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradInst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colorInst} stopOpacity={haySeleccion ? 0.05 : 0.15} />
                  <stop offset="95%" stopColor={colorInst} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

              <XAxis
                dataKey="fechaCorta"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={36}
              />

              <Tooltip
                content={
                  <TooltipCustom
                    comisiones={comisionesEfectivas}
                  />
                }
                cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
              />

              <ReferenceLine
                y={80}
                stroke="#00A86B"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{ value: "80%", position: "right", fontSize: 9, fill: "#00A86B", opacity: 0.7 }}
              />

              {/* Línea institucional — siempre */}
              <Area
                type="monotone"
                dataKey="institucional"
                stroke={colorInst}
                strokeWidth={haySeleccion ? 1.5 : 2}
                fill="url(#gradInst)"
                dot={false}
                activeDot={haySeleccion
                  ? false
                  : { r: 4, fill: COLOR_INST_SOLO, stroke: "#FFFFFF", strokeWidth: 2 }
                }
                name="Institución"
              />

              {/* Líneas de comisiones del select */}
              {comisionesEfectivas.map((c, i) => (
                <Area
                  key={c.comisionId}
                  type="monotone"
                  dataKey={`comision_${i}`}
                  stroke={PALETA_COMISIONES[i]}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4, fill: PALETA_COMISIONES[i], stroke: "#FFFFFF", strokeWidth: 2 }}
                  name={c.nombre}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
