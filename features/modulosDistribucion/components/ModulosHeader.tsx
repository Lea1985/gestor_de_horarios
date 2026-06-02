// features/modulosDistribucion/components/ModulosHeader.tsx

import { useRouter } from "next/navigation"

type Props = {
  dist: {
    version: number
    estado:  string
    asignacion: {
      identificadorEstructural: string
      titularidades?: { agente: { nombre: string; apellido: string } }[]
    }
  } | null
  esActivo:          boolean
  tieneModulos:      boolean
  editando:          boolean
  guardando:         boolean
  guardado:          boolean
  totalSeleccionados: number
  onGuardar:         () => void
  onEditar:          () => void
  onCancelarEdicion: () => void
  onNuevaVersion:    () => void
}

export function ModulosHeader({
  dist, esActivo, tieneModulos, editando, guardando, guardado,
  totalSeleccionados, onGuardar, onEditar, onCancelarEdicion, onNuevaVersion,
}: Props) {
  const router = useRouter()
  const agente = dist?.asignacion.titularidades?.[0]?.agente

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

      {/* Info */}
      <div>
        <button
          onClick={() => router.push("/protected/dashboard/distribuciones")}
          style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Módulos horarios
        </h1>
        {dist && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
              {dist.asignacion.identificadorEstructural}
            </span>
            {agente && <span> · {agente.apellido}, {agente.nombre}</span>}
            <span style={{ color: "var(--color-text-hint)" }}> · v{dist.version}</span>
            {!esActivo && (
              <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                Inactiva
              </span>
            )}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>

        {/* Activa sin módulos: solo guardar */}
        {esActivo && !tieneModulos && (
          <>
            {totalSeleccionados > 0 && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {totalSeleccionados} módulo{totalSeleccionados !== 1 ? "s" : ""} seleccionado{totalSeleccionados !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onGuardar}
              disabled={guardando}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? "Guardando..." : "Guardar módulos"}
            </button>
          </>
        )}

        {/* Activa con módulos, modo lectura */}
        {esActivo && tieneModulos && !editando && (
          <>
            {guardado && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success-text)", fontWeight: "var(--font-medium)" }}>
                ✓ Guardado
              </span>
            )}
            <button
              onClick={onEditar}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Editar
            </button>
            <button
              onClick={onNuevaVersion}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              Nueva versión
            </button>
          </>
        )}

        {/* Activa con módulos, modo edición */}
        {esActivo && tieneModulos && editando && (
          <>
            {totalSeleccionados > 0 && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                {totalSeleccionados} módulo{totalSeleccionados !== 1 ? "s" : ""} seleccionado{totalSeleccionados !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onCancelarEdicion}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={onGuardar}
              disabled={guardando}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        )}

      </div>
    </div>
  )
}