// features/dashboard/components/ComisionesProblematicas.tsx
"use client"

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import { CoberturaPorComision, TendenciaComision } from "@/lib/reporting/datasets/obtenerCoberturaPorComision"

// ── Constantes ────────────────────────────────────────────────────────────────
const MAX_SELECCION = 3
const PALETA_COMISIONES = ["#0EA5E9", "#F59E0B", "#8B5CF6"] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function colorCobertura(pct: number): string {
  if (pct >= 80) return "#00A86B"
  if (pct >= 50) return "#F5A524"
  return "#E5484D"
}

function iconoTendencia(t: TendenciaComision): { icono: string; color: string; label: string } {
  if (t === "sube") return { icono: "↗", color: "#00A86B", label: "Mejorando"    }
  if (t === "baja") return { icono: "↘", color: "#E5484D", label: "Empeorando"  }
  return                   { icono: "→", color: "#9CA3AF", label: "Estable"      }
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: { coberturaPorcentaje: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="coberturaPorcentaje"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip contentStyle={{ display: "none" }} cursor={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div style={{
      flex: "1 1 0", minWidth: 180,
      background: "#FFFFFF", border: "1px solid #E5E7EB",
      borderRadius: "var(--radius-xl)", padding: "var(--space-4)",
      display: "flex", flexDirection: "column", gap: "var(--space-3)",
    }}>
      <div style={{ height: 10, width: "60%", borderRadius: 4, background: "#E5E7EB" }} />
      <div style={{ height: 8,  width: "40%", borderRadius: 4, background: "#E5E7EB" }} />
      <div style={{ height: 36, borderRadius: 4, background: "#F1F4F8" }} />
      <div style={{ height: 24, borderRadius: 4, background: "#E5E7EB" }} />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardComisionProps {
  comision:     CoberturaPorComision
  indiceColor:  number | null   // null = no seleccionada; 0/1/2 = color de paleta
  deshabilitada: boolean        // max alcanzado y esta no está seleccionada
  onToggle:     (c: CoberturaPorComision) => void
}

function CardComision({ comision, indiceColor, deshabilitada, onToggle }: CardComisionProps) {
  const seleccionada = indiceColor !== null
  const colorSparkline = seleccionada
    ? PALETA_COMISIONES[indiceColor!]
    : colorCobertura(comision.coberturaPorcentaje)
  const tendencia = iconoTendencia(comision.tendencia)

  const borderColor = seleccionada
    ? PALETA_COMISIONES[indiceColor!]
    : "#E5E7EB"

  return (
    <div
      onClick={() => !deshabilitada && onToggle(comision)}
      style={{
        flex: "1 1 0", minWidth: 200, maxWidth: 320,
        background: "#FFFFFF",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4)",
        display: "flex", flexDirection: "column", gap: "var(--space-2)",
        cursor: deshabilitada ? "not-allowed" : "pointer",
        opacity: deshabilitada ? 0.45 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
        boxShadow: seleccionada
          ? `0 0 0 3px ${PALETA_COMISIONES[indiceColor!]}22`
          : "none",
      }}
      onMouseEnter={e => {
        if (!seleccionada && !deshabilitada)
          e.currentTarget.style.borderColor = "#D1D5DB"
      }}
      onMouseLeave={e => {
        if (!seleccionada && !deshabilitada)
          e.currentTarget.style.borderColor = "#E5E7EB"
      }}
    >
      {/* Indicador de selección — badge visible con color de paleta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 20 }}>
        {seleccionada ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 99,
            background: `${PALETA_COMISIONES[indiceColor!]}18`,
            border: `1px solid ${PALETA_COMISIONES[indiceColor!]}55`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: PALETA_COMISIONES[indiceColor!] }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: PALETA_COMISIONES[indiceColor!] }}>
              En gráfico
            </span>
          </div>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 99,
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>
              {deshabilitada ? "Máx. alcanzado" : "Clic para ver"}
            </span>
          </div>
        )}
      </div>

      {/* Nombre + curso */}
      <div>
        <p style={{
          margin: 0, fontSize: "var(--text-xs)", fontWeight: 500, color: "#1A1A1A",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {comision.nombre}
        </p>
        <p style={{
          margin: "2px 0 0", fontSize: "var(--text-2xs)", color: "#9CA3AF",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {comision.curso}{comision.turno ? ` · ${comision.turno}` : ""}
        </p>
      </div>

      {/* Sparkline */}
      <div style={{ marginLeft: -4, marginRight: -4 }}>
        <Sparkline data={comision.timeline} color={colorSparkline} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{
            fontSize: "var(--text-lg)", fontWeight: 500,
            color: colorCobertura(comision.coberturaPorcentaje),
            fontVariantNumeric: "tabular-nums",
          }}>
            {comision.coberturaPorcentaje}%
          </span>
          <span style={{ fontSize: "var(--text-2xs)", color: "#9CA3AF", marginLeft: 4 }}>
            cobertura
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 13, color: tendencia.color, lineHeight: 1 }}>{tendencia.icono}</span>
          <span style={{ fontSize: "var(--text-2xs)", color: tendencia.color }}>{tendencia.label}</span>
        </div>
      </div>

      {/* Variación */}
      {comision.variacion > 0 && (
        <div style={{
          paddingTop: "var(--space-2)", borderTop: "1px solid #E5E7EB",
          fontSize: "var(--text-2xs)", color: "#9CA3AF",
        }}>
          Variación diaria:{" "}
          <span style={{ color: comision.variacion > 20 ? "#E5484D" : "#F5A524", fontWeight: 500 }}>
            ±{comision.variacion}%
          </span>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  data:                    CoberturaPorComision[]
  loading:                 boolean
  error:                   string | null
  // Multi-selección: array de 0 a MAX_SELECCION elementos
  comisionesSeleccionadas: CoberturaPorComision[]
  onToggle:                (c: CoberturaPorComision) => void
  onVerTodas:              () => void
  onLimpiar:               () => void
}

export function ComisionesProblematicas({
  data, loading, error,
  comisionesSeleccionadas, onToggle, onVerTodas, onLimpiar,
}: Props) {
  if (!loading && !error && data.length === 0) return null

  const haySeleccion = comisionesSeleccionadas.length > 0
  const maxAlcanzado = comisionesSeleccionadas.length >= MAX_SELECCION

  const instruccion = (() => {
    if (comisionesSeleccionadas.length === 0)
      return "Clic en una comisión para compararla en el gráfico (máx. 3)"
    if (comisionesSeleccionadas.length === 1)
      return `Mostrando ${comisionesSeleccionadas[0].nombre} · podés agregar 2 más`
    if (comisionesSeleccionadas.length < MAX_SELECCION)
      return `${comisionesSeleccionadas.length} comisiones seleccionadas · podés agregar 1 más`
    return `${MAX_SELECCION} comisiones seleccionadas (máximo)`
  })()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "#1A1A1A" }}>
            Comisiones con mayor variación
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "#6B7280" }}>
            {instruccion}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {haySeleccion && (
            <button
              onClick={onLimpiar}
              style={{
                background: "none", border: "1px solid #E5E7EB",
                borderRadius: "var(--radius-md)", padding: "4px 10px",
                fontSize: "var(--text-xs)", color: "#6B7280", cursor: "pointer",
              }}
            >
              Limpiar
            </button>
          )}
          <button
            onClick={onVerTodas}
            style={{
              background: "none", border: "1px solid #E5E7EB",
              borderRadius: "var(--radius-md)", padding: "4px 10px",
              fontSize: "var(--text-xs)", color: "#6B7280", cursor: "pointer",
            }}
          >
            Ver todas →
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: "var(--radius-md)",
          background: "#FDE8E8", border: "1px solid #E5484D",
          fontSize: "var(--text-xs)", color: "#E5484D",
        }}>
          {error}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "stretch" }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : data.map(c => {
              const idx = comisionesSeleccionadas.findIndex(s => s.comisionId === c.comisionId)
              const seleccionada = idx !== -1
              return (
                <CardComision
                  key={c.comisionId}
                  comision={c}
                  indiceColor={seleccionada ? idx : null}
                  deshabilitada={!seleccionada && maxAlcanzado}
                  onToggle={onToggle}
                />
              )
            })
        }
      </div>
    </div>
  )
}
