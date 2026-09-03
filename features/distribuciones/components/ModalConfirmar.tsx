// features/distribuciones/components/ModalConfirmar.tsx
// UX-DIS-010: modal de confirmación genérico, compartido entre el listado
// y el detalle de una distribución. Antes cada pantalla tenía su propia
// copia local con textos levemente distintos ("Confirmar acción" vs
// "Confirmar eliminación"; "distribución horaria" vs "distribución"), y
// la del listado ni siquiera soportaba el caso "Reactivar" que el detalle
// ya necesitaba (título/label/estilo no-destructivo parametrizables).
type Props = {
  titulo?:         string
  mensaje?:        string
  labelConfirmar?: string
  destructivo?:    boolean
  onConfirmar:     () => void
  onCancelar:      () => void
  guardando:       boolean
}
export function ModalConfirmar({
  titulo         = "Confirmar eliminación",
  mensaje        = "¿Eliminar esta distribución horaria? Se eliminarán también sus módulos asociados.",
  labelConfirmar = "Eliminar",
  destructivo    = true,
  onConfirmar, onCancelar, guardando,
}: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
          {titulo}
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: guardando ? "not-allowed" : "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={guardando}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-lg)", border: destructivo ? "none" : "1px solid var(--color-border-strong)",
              background: destructivo ? "var(--color-error)" : "var(--color-primary)",
              fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white",
              cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? `${labelConfirmar === "Reactivar" ? "Reactivando" : "Eliminando"}...` : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}