// features/dashboard/components/RankingsBlock.tsx
"use client"

import { Fragment, useState } from "react"
import { useRankings } from "../hooks/useRankings"
import { RangoRankings, RankingItem } from "../types/rankings"

const RANGOS: { value: RangoRankings; label: string }[] = [
  { value: "mes",      label: "Mes"     },
  { value: "semestre", label: "6 meses" },
  { value: "anio",     label: "Año"     },
  { value: "todo",     label: "Todo"    },
]

const ACENTOS = [
  "#0A2540",   // primary — agentes
  "#1E9BB8",   // accent teal — artículos
  "#F5A524",   // warning — comisiones
]

// ── Barra de progreso ────────────────────────────────────────────────────────
// El máximo visual es el mayor entre el valor real y un "piso" de referencia,
// para que una sola fila no ocupe siempre el 100%.
function Barra({ valor, max, color }: { valor: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((valor / max) * 100), 100) : 0
  return (
    <div style={{
      height: 3,
      borderRadius: 99,
      background: "#E5E7EB",
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        borderRadius: 99,
        background: color,
        transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  )
}

// ── Fila ─────────────────────────────────────────────────────────────────────
function FilaRanking({ item, pos, max, color }: {
  item: RankingItem; pos: number; max: number; color: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--font-medium)",
          color: pos < 3 ? color : "#9CA3AF",
          width: 22,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}>
          {pos + 1}°
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            fontWeight: "var(--font-medium)",
            color: "#1A1A1A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textTransform: "capitalize",
          }}>
            {item.label.toLowerCase().replace(/^\w/, c => c.toUpperCase())}
          </p>
          {item.sub && (
            <p style={{
              margin: "1px 0 0",
              fontSize: "var(--text-2xs)",
              color: "#9CA3AF",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {item.sub}
            </p>
          )}
        </div>
        <span style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-medium)",
          color: color,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}>
          {item.total}
        </span>
      </div>
      <div style={{ paddingLeft: 30 }}>
        <Barra valor={item.total} max={max} color={color} />
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 22, height: 11, borderRadius: 3, background: "#E5E7EB", flexShrink: 0 }} />
        <div style={{ flex: 1, height: 11, borderRadius: 3, background: "#E5E7EB" }} />
        <div style={{ width: 16, height: 11, borderRadius: 3, background: "#E5E7EB", flexShrink: 0 }} />
      </div>
      <div style={{ paddingLeft: 30 }}>
        <div style={{ height: 3, borderRadius: 99, background: "#E5E7EB" }} />
      </div>
    </div>
  )
}

// ── Columna ──────────────────────────────────────────────────────────────────
function Columna({ titulo, items, loading, color, onVerTodos }: {
  titulo: string; items: RankingItem[]; loading: boolean
  color: string; onVerTodos?: () => void
}) {
  // Máximo visual: el mayor valor real. Si hay un solo ítem con total alto,
  // mostramos la barra proporcional al total global (no siempre 100%).
  const max = items[0]?.total ?? 1

  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 200,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
    }}>
      {/* Cabecera columna */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: "var(--space-3)", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "#1A1A1A" }}>
          {titulo}
        </span>
      </div>

      {/* Ítems */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", flex: 1 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
          : items.length === 0
            ? <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#9CA3AF", textAlign: "center", padding: "var(--space-6) 0" }}>Sin datos para este período</p>
            : items.slice(0, 5).map((item, i) => (
                <FilaRanking key={item.id} item={item} pos={i} max={max} color={color} />
              ))
        }
      </div>

      {/* Ver todos */}
      {!loading && items.length > 0 && onVerTodos && (
        <button
          onClick={onVerTodos}
          style={{
            background: "none",
            border: "none",
            borderTop: "1px solid #E5E7EB",
            paddingTop: "var(--space-3)",
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          Ver todos →
        </button>
      )}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
function ModalVerTodos({ titulo, items, color, onClose }: {
  titulo: string; items: RankingItem[]; color: string; onClose: () => void
}) {
  const max = items[0]?.total ?? 1
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          width: "min(500px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "#1A1A1A" }}>
            {titulo}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xl)", color: "#9CA3AF", lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {items.map((item, i) => <FilaRanking key={item.id} item={item} pos={i} max={max} color={color} />)}
        </div>
      </div>
    </div>
  )
}

// ── Bloque principal ─────────────────────────────────────────────────────────
interface ModalState { titulo: string; items: RankingItem[]; color: string }

export function RankingsBlock() {
  const { data, loading, error, rango, setRango } = useRankings("anio")
  const [modal, setModal] = useState<ModalState | null>(null)

  const columnas = [
    { titulo: "Agentes con más licencias",    items: data?.agentesConMasLicencias ?? [],    color: ACENTOS[0] },
    { titulo: "Artículos más usados",         items: data?.articulosMasUsados ?? [],         color: ACENTOS[1] },
    { titulo: "Comisiones con más ausencias", items: data?.comisionesConMasAusencias ?? [], color: ACENTOS[2] },
  ]

  return (
    <>
      {modal && (
        <ModalVerTodos titulo={modal.titulo} items={modal.items} color={modal.color} onClose={() => setModal(null)} />
      )}

      {/* Card contenedor */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4) var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}>

        {/* Header del bloque */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "#1A1A1A" }}>
              Rankings
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "#6B7280" }}>
              Licencias, artículos y comisiones con mayor impacto
            </p>
          </div>

          {/* Selector de rango — segmented control discreto */}
          <div style={{
            display: "inline-flex",
            background: "#F1F4F8",
            borderRadius: "var(--radius-lg)",
            padding: 3,
            gap: 2,
          }}>
            {RANGOS.map(r => {
              const activo = rango === r.value
              return (
                <button
                  key={r.value}
                  onClick={() => setRango(r.value)}
                  style={{
                    padding: "4px 12px",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    background: activo ? "#FFFFFF" : "transparent",
                    boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
                    color: activo ? "#1A1A1A" : "#6B7280",
                    fontSize: "var(--text-xs)",
                    fontWeight: activo ? "var(--font-medium)" : "var(--font-regular)",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FDE8E8", border: "1px solid #E5484D", fontSize: "var(--text-xs)", color: "#E5484D" }}>
            {error}
          </div>
        )}

        {/* Grid de tres columnas con separadores verticales */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0 }}>
          {columnas.map((col, i) => (
            <Fragment key={col.titulo}>
              <div style={{ padding: i === 0 ? "0 var(--space-6) 0 0" : i === 2 ? "0 0 0 var(--space-6)" : "0 var(--space-6)" }}>
                <Columna
                  titulo={col.titulo}
                  items={col.items}
                  loading={loading}
                  color={col.color}
                  onVerTodos={() => setModal({ titulo: col.titulo, items: col.items, color: col.color })}
                />
              </div>
              {i < 2 && (
                <div style={{ background: "#E5E7EB", width: 1 }} />
              )}
            </Fragment>
          ))}
        </div>

      </div>
    </>
  )
}
