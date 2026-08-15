// features/dashboard/components/ProximosVencimientos.tsx
"use client"

import { PendientesDashboard } from "../types"

interface Props {
  pendientes: PendientesDashboard | null
  loading:    boolean
  onNavigate: (path: string) => void
}

type ItemVencimiento = {
  icono:  string
  texto:  string
  color:  string
  path:   string
}

function buildItems(p: PendientesDashboard): ItemVencimiento[] {
  const items: ItemVencimiento[] = []

  if (p.reemplazosVencenSemana > 0)
    items.push({
      icono: "🔄",
      texto: `${p.reemplazosVencenSemana} reemplazo${p.reemplazosVencenSemana > 1 ? "s" : ""} vence${p.reemplazosVencenSemana === 1 ? "" : "n"} esta semana`,
      color: "#d97706",
      path:  "/protected/dashboard/incidencias?vence=7dias",
    })

  if (p.vencenHoy > 0)
    items.push({
      icono: "⚠",
      texto: `${p.vencenHoy} incidencia${p.vencenHoy > 1 ? "s" : ""} vence${p.vencenHoy === 1 ? "" : "n"} hoy`,
      color: "#dc2626",
      path:  "/protected/dashboard/incidencias?vence=hoy",
    })

  if (p.vencenManana > 0)
    items.push({
      icono: "📅",
      texto: `${p.vencenManana} incidencia${p.vencenManana > 1 ? "s" : ""} vence${p.vencenManana === 1 ? "" : "n"} mañana`,
      color: "#d97706",
      path:  "/protected/dashboard/incidencias?vence=manana",
    })

  if (p.vencenEstaSemana > 0)
    items.push({
      icono: "📆",
      texto: `${p.vencenEstaSemana} incidencia${p.vencenEstaSemana > 1 ? "s" : ""} vence${p.vencenEstaSemana === 1 ? "" : "n"} esta semana`,
      color: "#6B7280",
      path:  "/protected/dashboard/incidencias?vence=resto-semana",
    })

  return items
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[80, 65, 70].map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#E5E7EB", flexShrink: 0 }} />
          <div style={{ height: 11, width: `${w}%`, borderRadius: 3, background: "#E5E7EB" }} />
        </div>
      ))}
    </div>
  )
}

export function ProximosVencimientos({ pendientes, loading, onNavigate }: Props) {
  const items = pendientes ? buildItems(pendientes) : []

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
      {/* Header */}
      <div>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "#1A1A1A" }}>
          Próximos vencimientos
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "#6B7280" }}>
          Incidencias y reemplazos que vencen próximamente
        </p>
      </div>

      {/* Contenido */}
      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "var(--text-xs)", color: "#16a34a",
        }}>
          Sin vencimientos próximos ✓
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => onNavigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "none", border: "none", padding: "6px 10px",
                borderRadius: "var(--radius-md)", cursor: "pointer",
                textAlign: "left", width: "100%",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{item.icono}</span>
              <span style={{
                fontSize: "var(--text-xs)", color: "var(--color-text-primary)",
                flex: 1,
              }}>
                {item.texto}
              </span>
              <span style={{
                fontSize: "var(--text-2xs)", color: item.color,
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                Ver →
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <button
          onClick={() => onNavigate("/protected/dashboard/calendario")}
          style={{
            marginTop: "auto",
            background: "none", border: "none",
            borderTop: "1px solid #E5E7EB",
            paddingTop: "var(--space-3)",
            paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
            fontSize: "var(--text-xs)", color: "#6B7280",
            cursor: "pointer", textAlign: "left",
          }}
        >
          Ver calendario →
        </button>
      )}
    </div>
  )
}