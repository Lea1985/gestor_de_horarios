// features/asignaciones/components/AsignacionDetalleHeader.tsx
import { useRouter } from "next/navigation"
import type { AsignacionDetalle } from "../hooks/useAsignacionDetalle"

function Badge({ estado }: { estado: string }) {
  const activo = estado === "ACTIVO"
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
      background: activo ? "var(--color-success-bg)" : "var(--color-error-bg)",
      color:      activo ? "var(--color-success-text)" : "var(--color-error-text)",
    }}>
      {estado}
    </span>
  )
}

type Props = {
  asignacion:            AsignacionDetalle
  titular:               { nombre: string; apellido: string } | null
  contexto:              string[]
  onEliminar:            () => void
  puedeEliminar:         boolean
  motivoBloqueoEliminar: string | null
  tieneHistorial:        boolean
  motivoBloqueoEditar:   string | null
  esEliminada:           boolean
  onReactivar:           () => void
}

export function AsignacionDetalleHeader({
  asignacion, titular, contexto,
  onEliminar, puedeEliminar, motivoBloqueoEliminar,
  tieneHistorial, motivoBloqueoEditar,
  esEliminada, onReactivar,
}: Props) {
  const router = useRouter()
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <button
          onClick={() => router.push("/protected/dashboard/asignaciones")}
          style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          ← Volver a asignaciones
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
            {asignacion.identificadorEstructural}
          </h1>
          {esEliminada && (
            <span style={{ fontSize: "var(--text-2xs)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
              Eliminada
            </span>
          )}
        </div>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          {titular
            ? `${titular.apellido}, ${titular.nombre}`
            : <em>Vacante</em>}
          {contexto.length > 0 && (
            <span style={{ color: "var(--color-text-hint)" }}> · {contexto.join(" · ")}</span>
          )}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
        {esEliminada ? (
          <button
            onClick={onReactivar}
            style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
          >
            Reactivar
          </button>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <Badge estado={asignacion.estado} />
              <button
                onClick={() => router.push(`/protected/dashboard/asignaciones/${asignacion.id}/editar`)}
                style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Editar
              </button>
              <button
                onClick={() => puedeEliminar && onEliminar()}
                disabled={!puedeEliminar}
                title={motivoBloqueoEliminar ?? undefined}
                style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none", background: puedeEliminar ? "var(--color-error)" : "var(--color-surface-raised)", color: puedeEliminar ? "white" : "var(--color-text-hint)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: puedeEliminar ? "pointer" : "not-allowed", opacity: puedeEliminar ? 1 : 0.5 }}
              >
                Eliminar
              </button>
            </div>
            {motivoBloqueoEliminar && (
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                {motivoBloqueoEliminar}
              </span>
            )}
            {tieneHistorial && motivoBloqueoEditar && (
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                {motivoBloqueoEditar}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}