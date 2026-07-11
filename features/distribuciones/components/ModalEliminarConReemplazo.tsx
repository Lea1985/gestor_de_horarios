// features/distribuciones/components/ModalEliminarConReemplazo.tsx
// Se muestra cuando eliminar una distribución afecta clases con reemplazo
// activo. Es la contraparte, para el flujo de borrado, del modal que ya
// existe para asignarModulos.

import type { TramoReemplazo } from "../types"

type Props = {
  tramo:       TramoReemplazo
  onConfirmar: (mantenerReemplazo: boolean) => void
  onCancelar:  () => void
  guardando:   boolean
}

export function ModalEliminarConReemplazo({ tramo, onConfirmar, onCancelar, guardando }: Props) {
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
            Esta distribución tiene reemplazos activos
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Eliminarla va a borrar las clases entre {new Date(tramo.desde).toLocaleDateString("es-AR")} y {new Date(tramo.hasta).toLocaleDateString("es-AR")}.
          </p>
        </div>

        {tramo.migrable && tramo.suplente ? (
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text-primary)" }}>
            Todo el tramo está cubierto por el mismo suplente:{" "}
            <strong style={{ color: "var(--color-accent)" }}>{tramo.suplente.nombre}</strong>
            {" "}({tramo.clasesConReemplazo} de {tramo.totalClases} clases).
          </div>
        ) : (
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            {tramo.clasesConReemplazo} de {tramo.totalClases} clases tienen reemplazo con más de un suplente distinto — se van a perder al eliminar la distribución. No hay forma de "mantenerlo" en este caso porque la distribución completa desaparece.
          </div>
        )}

        <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
          Nota: al eliminar la distribución no hay "clases nuevas" a las que migrar el reemplazo — esta confirmación es solo para que sepas que esos reemplazos se van a perder junto con las clases.
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: guardando ? "not-allowed" : "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(false)}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Eliminando..." : "Eliminar de todas formas"}
          </button>
        </div>
      </div>
    </div>
  )
}
