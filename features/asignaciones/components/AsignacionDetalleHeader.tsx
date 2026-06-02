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
}

export function AsignacionDetalleHeader({
  asignacion, titular, contexto,
  onEliminar, puedeEliminar, motivoBloqueoEliminar,
  tieneHistorial, motivoBloqueoEditar,
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
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
          {asignacion.identificadorEstructural}
        </h1>
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
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Badge estado={asignacion.estado} />

          {/* Editar — siempre activo, badge cuando tiene historial */}
          <button
            onClick={() => router.push(`/protected/dashboard/asignaciones/${asignacion.id}/editar`)}
            style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Editar
          </button>

          {/* Eliminar — bloqueado si tiene incidencias activas */}
          <button
            onClick={() => puedeEliminar && onEliminar()}
            disabled={!puedeEliminar}
            title={motivoBloqueoEliminar ?? undefined}
            style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none", background: puedeEliminar ? "var(--color-error)" : "var(--color-surface-raised)", color: puedeEliminar ? "white" : "var(--color-text-hint)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: puedeEliminar ? "pointer" : "not-allowed", opacity: puedeEliminar ? 1 : 0.5 }}
          >
            Eliminar
          </button>
        </div>

        {/* Notas debajo de los botones */}
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
      </div>
    </div>
  )
}
