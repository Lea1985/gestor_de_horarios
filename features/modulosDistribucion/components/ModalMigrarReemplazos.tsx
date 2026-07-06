// features/modulosDistribucion/components/ModalMigrarReemplazos.tsx

import { useState } from "react"
import type { IncidenciaAfectada } from "../types"

type Props = {
  incidencias: IncidenciaAfectada[]
  onConfirmar: (idsAMigrar: number[]) => void
  onCancelar:  () => void
  guardando:   boolean
}

export function ModalMigrarReemplazos({ incidencias, onConfirmar, onCancelar, guardando }: Props) {
  const migrables   = incidencias.filter(i => i.migrable)
  const noMigrables = incidencias.filter(i => !i.migrable)

  const [seleccionados, setSeleccionados] = useState<number[]>(
    migrables.map(i => i.incidenciaId)
  )

  function toggle(id: number) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
            Reemplazos afectados
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Hay incidencias con reemplazos activos en clases futuras que se van a recrear con la nueva distribución. Elegí a cuáles querés aplicarles el mismo suplente automáticamente.
          </p>
        </div>

        {migrables.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <p style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-hint)", marginBottom: "var(--space-1)" }}>
              Se puede migrar automáticamente
            </p>
            {migrables.map(i => (
              <label
                key={i.incidenciaId}
                style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", fontSize: "var(--text-xs)", padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", cursor: "pointer", background: seleccionados.includes(i.incidenciaId) ? "var(--color-surface-raised)" : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(i.incidenciaId)}
                  onChange={() => toggle(i.incidenciaId)}
                  style={{ marginTop: 2, cursor: "pointer" }}
                />
                <span>
                  <strong style={{ color: "var(--color-text-primary)" }}>{i.codigario ?? "Incidencia"}</strong>
                  {" "}({new Date(i.fecha_desde).toLocaleDateString("es-AR")} – {new Date(i.fecha_hasta).toLocaleDateString("es-AR")})
                  <br />
                  Suplente: <span style={{ color: "var(--color-accent)", fontWeight: "var(--font-medium)" }}>{i.suplente?.nombre}</span>
                  {" "}— {i.totalClasesConReemplazo} clase{i.totalClasesConReemplazo !== 1 ? "s" : ""}
                </span>
              </label>
            ))}
          </div>
        )}

        {noMigrables.length > 0 && (
          <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            {noMigrables.length} incidencia{noMigrables.length !== 1 ? "s tuvieron" : " tuvo"} más de un suplente distinto en el período — no se pueden migrar automáticamente. Vas a tener que volver a cargar esos reemplazos manualmente después de confirmar.
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(seleccionados)}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Aplicando..." : "Confirmar y continuar"}
          </button>
        </div>
      </div>
    </div>
  )
}