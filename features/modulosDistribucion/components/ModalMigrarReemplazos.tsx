// features/modulosDistribucion/components/ModalMigrarReemplazos.tsx
import { useState } from "react"
import type { AvisoReconciliacion } from "../types"
// Fase 3c — muestra el aviso de la reconciliación: la lista exacta de
// reemplazos de clases futuras que se anulan y cuántas clases pasadas
// cambian. Nada se aplicó todavía; confirmar reintenta con la confirmación.
// "Mantener reemplazo" lo elige el usuario (nunca es automático) y el backend
// solo lo aplica si la licencia tenía un único suplente.
type Props = {
  aviso:       AvisoReconciliacion
  onConfirmar: (mantenerReemplazo: boolean) => void
  onCancelar:  () => void
  guardando:   boolean
}
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" })
export function ModalMigrarReemplazos({ aviso, onConfirmar, onCancelar, guardando }: Props) {
  const [mantener, setMantener] = useState(false)
  const reemplazos = aviso.reemplazosAAnular
  const otrasPasadas = aviso.pasadasAReescribir.length
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Este cambio requiere confirmación
        </h3>
        {reemplazos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              Se van a anular {reemplazos.length} {reemplazos.length === 1 ? "reemplazo" : "reemplazos"} de clases que dejan de existir:
            </p>
            <ul style={{ maxHeight: 160, overflowY: "auto", margin: 0, padding: "8px 12px", listStyle: "none", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text-primary)" }}>
              {reemplazos.map(r => (
                <li key={r.reemplazoId}>{fechaCorta(r.fecha)} — {r.suplente}</li>
              ))}
            </ul>
            <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-xs)", color: "var(--color-text-primary)", cursor: "pointer" }}>
              <input type="checkbox" checked={mantener} onChange={e => setMantener(e.target.checked)} disabled={guardando} />
              Mantener el suplente en las clases nuevas (solo si la licencia tenía un único suplente)
            </label>
          </div>
        )}
        {(aviso.dictadasAReescribir.length > 0 || otrasPasadas > 0 || aviso.clasesPasadasNuevas.length > 0) && (
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            Cambia el pasado:
            {aviso.dictadasAReescribir.length > 0 && <> {aviso.dictadasAReescribir.length} clases ya dictadas se reescriben.</>}
            {otrasPasadas > 0 && <> {otrasPasadas} clases pasadas cambian de estado{aviso.reemplazadasPasadas > 0 ? ` (${aviso.reemplazadasPasadas} con reemplazo, que se conserva)` : ""}.</>}
            {aviso.clasesPasadasNuevas.length > 0 && <> Se generan {aviso.clasesPasadasNuevas.length} clases en fechas pasadas.</>}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(mantener)}
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Aplicando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}
