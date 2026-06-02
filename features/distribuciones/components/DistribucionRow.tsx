// features/distribuciones/components/DistribucionRow.tsx

import Link from "next/link"
import type { Distribucion } from "../types"
import { DiasResumen } from "./DiasResumen"

const s = {
  th: {
    textAlign: "left" as const,
    fontSize: "var(--text-2xs)",
    fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--color-text-secondary)",
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

function Badge({ estado }: { estado: string }) {
  const activo = estado === "ACTIVO"
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--font-medium)",
      background: activo ? "var(--color-success-bg)" : "var(--color-surface-raised)",
      color:      activo ? "var(--color-success-text)" : "var(--color-text-secondary)",
    }}>
      {estado}
    </span>
  )
}

type Props = {
  asignacionId: number
  lista:        Distribucion[]
  expandido:    boolean
  onToggle:     (asignacionId: number) => void
  onEliminar:   (id: number) => void
}

export function DistribucionRow({ asignacionId, lista, expandido, onToggle, onEliminar }: Props) {
  const activa     = lista.find(d => d.estado === "ACTIVO")
  const primera    = lista[0]
  const asignacion = lista[0].asignacion

  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
    }}>
      {/* Header del acordeón */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
          borderBottom: expandido ? "1px solid var(--color-border)" : "none",
        }}
        onClick={() => onToggle(asignacionId)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", userSelect: "none" }}>
            {expandido ? "▾" : "▸"}
          </span>
          <div>
            <span style={{
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
            }}>
              {asignacion.identificadorEstructural}
            </span>

            {asignacion.titularidades?.[0]?.agente && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginLeft: "var(--space-2)" }}>
                {asignacion.titularidades[0].agente.apellido}, {asignacion.titularidades[0].agente.nombre}
              </span>
            )}

            {asignacion.curso && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginLeft: "var(--space-2)" }}>
                · {asignacion.curso.nombre}
              </span>
            )}

            {asignacion.turno && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginLeft: "var(--space-1)" }}>
                · {asignacion.turno.nombre}
              </span>
            )}

            {activa && <DiasResumen distribucion={activa} />}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {activa && <Badge estado="ACTIVO" />}
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
            {lista.length} versión{lista.length !== 1 ? "es" : ""}
          </span>
          {!expandido && (
            <div style={{ display: "flex", gap: "var(--space-2)" }} onClick={e => e.stopPropagation()}>
              <Link
                href={`/protected/dashboard/distribuciones/${primera.id}/modulos`}
                style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", textDecoration: "none" }}
              >
                Módulos →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de versiones */}
      {expandido && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Versión", "Estado", "Vigencia desde", "Vigencia hasta", ""].map(col => (
                <th key={col} style={s.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(d => (
              <tr
                key={d.id}
                style={{ transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={s.td}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>v{d.version}</span>
                </td>
                <td style={s.td}><Badge estado={d.estado} /></td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {d.fecha_vigencia_desde.slice(0, 10)}
                </td>
                <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {d.fecha_vigencia_hasta?.slice(0, 10) ?? (
                    <span style={{ color: "var(--color-text-hint)" }}>Indefinida</span>
                  )}
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <Link
                      href={`/protected/dashboard/distribuciones/${d.id}/modulos`}
                      style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", textDecoration: "none" }}
                    >
                      Módulos {d._count.distribucionModulos > 0 ? `(${d._count.distribucionModulos})` : ""}
                    </Link>
                    {d.estado === "ACTIVO" && (
                      <button
                        onClick={() => onEliminar(d.id)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-medium)",
                          color: "var(--color-error)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}