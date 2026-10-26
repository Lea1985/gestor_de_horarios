// features/modulosDistribucion/components/ModalNuevaVersion.tsx
// Fase 3c — la nueva versión rige desde la fecha elegida (por defecto, hoy;
// posterior al inicio de la actual) y nace con una copia de los módulos.
type Props = {
  fecha:          string
  fechaMinima:    string
  onCambiarFecha: (fecha: string) => void
  onConfirmar: () => void
  onCancelar:  () => void
  guardando:   boolean
}

export function ModalNuevaVersion({ fecha, fechaMinima, onCambiarFecha, onConfirmar, onCancelar, guardando }: Props) {
  const fechaValida = !!fecha && fecha >= fechaMinima
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
          Nueva versión
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          La versión actual se cierra el día anterior a la fecha elegida. La nueva nace con los mismos módulos, así que las clases no cambian; después ajustá los módulos con "Editar" sobre la nueva versión.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginBottom: "var(--space-6)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
          Rige desde
          <input
            type="date"
            value={fecha}
            min={fechaMinima}
            onChange={e => onCambiarFecha(e.target.value)}
            disabled={guardando}
            style={{ padding: "6px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-strong)", fontSize: "var(--text-sm)" }}
          />
        </label>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={guardando || !fechaValida}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando || !fechaValida ? "not-allowed" : "pointer", opacity: guardando || !fechaValida ? 0.6 : 1 }}
          >
            {guardando ? "Creando..." : "Confirmar nueva versión"}
          </button>
        </div>
      </div>
    </div>
  )
}