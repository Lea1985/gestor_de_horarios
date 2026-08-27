//features/incidencias/components/ModalConfirmar.tsx
import { useState } from "react"

export function ModalConfirmar({ mensaje, onConfirmar, onCancelar, labelConfirmar = "Eliminar" }: {
  mensaje:          string
  onConfirmar:      () => void | Promise<unknown>
  onCancelar:       () => void
  labelConfirmar?:  string
}) {
  const esDestructivo = labelConfirmar === "Eliminar"
  // UX-INC-012: antes onConfirmar era un callback sin más -- el llamador
  // (page.tsx) cerraba el modal sin esperar a que la acción terminara, y
  // acá no había ningún estado de "procesando" que bloqueara un doble
  // click mientras la request seguía en vuelo. Ahora el modal espera
  // internamente a onConfirmar (puede ser async) y deshabilita los
  // botones mientras tanto -- funciona para todos los módulos que ya
  // usan este componente, no solo incidencias.
  const [procesando, setProcesando] = useState(false)

  async function handleConfirmar() {
    if (procesando) return
    setProcesando(true)
    try {
      await onConfirmar()
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={procesando ? undefined : onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
          Confirmar acción
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            disabled={procesando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: procesando ? "not-allowed" : "pointer", opacity: procesando ? 0.6 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={procesando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: esDestructivo ? "var(--color-error)" : "var(--color-accent)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: procesando ? "not-allowed" : "pointer", opacity: procesando ? 0.6 : 1 }}
          >
            {procesando ? "Procesando..." : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}