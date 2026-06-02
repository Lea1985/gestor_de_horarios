// features/distribuciones/components/DistribucionList.tsx

import type { Distribucion } from "../types"
import { DistribucionRow } from "./DistribucionRow"

type Props = {
  gruposFiltrados: Map<number, Distribucion[]>
  expandidos:      Set<number>
  hayFiltros:      boolean
  onToggle:        (asignacionId: number) => void
  onEliminar:      (id: number) => void
  onLimpiarFiltros: () => void
}

export function DistribucionList({
  gruposFiltrados, expandidos, hayFiltros,
  onToggle, onEliminar, onLimpiarFiltros,
}: Props) {
  if (gruposFiltrados.size === 0 && hayFiltros) {
    return (
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-12)",
        textAlign: "center",
        fontSize: "var(--text-sm)",
        color: "var(--color-text-hint)",
      }}>
        Sin resultados.{" "}
        <button
          onClick={onLimpiarFiltros}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-medium)",
            padding: 0,
          }}
        >
          Limpiar filtros
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {Array.from(gruposFiltrados.entries()).map(([asignacionId, lista]) => (
        <DistribucionRow
          key={asignacionId}
          asignacionId={asignacionId}
          lista={lista}
          expandido={expandidos.has(asignacionId)}
          onToggle={onToggle}
          onEliminar={onEliminar}
        />
      ))}
    </div>
  )
}