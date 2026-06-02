// app/protected/dashboard/asignaciones/[id]/editar/page.tsx
"use client"

import { useParams, useRouter } from "next/navigation"
import {
  useEditarAsignacion,
  EditarAsignacionForm,
} from "@/features/asignaciones"

export default function EditarAsignacionPage() {
  const params = useParams()
  const id     = params?.id as string
  const router = useRouter()

  const {
    loading, saving, error, setError,
    restringido, form,
    unidades, comisiones, materiasFiltradas, turnos,
    setField, guardar,
  } = useEditarAsignacion(id)

  if (loading || !form) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignación...
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 560 }}>

      <button
        onClick={() => router.back()}
        style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", padding: 0 }}
      >
        ← Volver
      </button>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      <EditarAsignacionForm
        form={form}
        restringido={restringido}
        saving={saving}
        unidades={unidades}
        comisiones={comisiones}
        materiasFiltradas={materiasFiltradas}
        turnos={turnos}
        onField={setField}
        onGuardar={guardar}
        onCancelar={() => router.back()}
      />

    </div>
  )
}