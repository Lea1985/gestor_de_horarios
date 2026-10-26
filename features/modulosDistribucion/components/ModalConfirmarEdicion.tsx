// features/modulosDistribucion/components/ModalConfirmarEdicion.tsx
// UX-DIS-003 — al editar los módulos de una distribución que ya tiene
// módulos asignados, el guardado puede suspender clases ya generadas que
// dejen de coincidir con la nueva selección. Antes esto solo se avisaba si
// había un reemplazo activo cubriendo el tramo (ModalMigrarReemplazos); si
// no había reemplazo, se guardaba directo y sin aviso. Este modal cubre ese
// hueco con un aviso previo genérico, sin conteo exacto.
// Fase 3c — el usuario elige desde cuándo rige: hoy (por defecto) o el inicio
// de la distribución. Si eso cambia el pasado, el backend lo avisa con el
// detalle antes de aplicar nada (ModalMigrarReemplazos).
type Props = {
  desde:         "hoy" | "inicio"
  inicio:        string
  onCambiarDesde: (desde: "hoy" | "inicio") => void
  onConfirmar: () => void
  onCancelar:  () => void
  guardando:   boolean
}
export function ModalConfirmarEdicion({ desde, inicio, onCambiarDesde, onConfirmar, onCancelar, guardando }: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
          Confirmar cambios
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          Vas a modificar los módulos de esta distribución. Las clases que ya no coincidan con
          la nueva selección quedarán suspendidas (no se eliminan) — si volvés a incluir esos
          módulos, se recuperan automáticamente.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
          <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", cursor: "pointer" }}>
            <input type="radio" name="desdeEdicion" checked={desde === "hoy"} onChange={() => onCambiarDesde("hoy")} disabled={guardando} />
            Desde hoy (el pasado no se toca)
          </label>
          <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", cursor: "pointer" }}>
            <input type="radio" name="desdeEdicion" checked={desde === "inicio"} onChange={() => onCambiarDesde("inicio")} disabled={guardando} />
            Desde el inicio de la distribución ({new Date(inicio).toLocaleDateString("es-AR", { timeZone: "UTC" })})
          </label>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Confirmar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}