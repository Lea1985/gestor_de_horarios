// app/protected/dashboard/incidencias/editar/[id]/page.tsx
"use client"
import { useParams, useRouter } from "next/navigation"
import { useEditarIncidencia, EditarIncidenciaForm } from "@/features/incidencias"

export default function EditarIncidenciaPage() {
  const router = useRouter()
  const params = useParams()
  const id     = params.id as string
  const {
    loading, guardando, error, setError,
    codigarios, items, loadingItems,
    tieneReemplazo,
    form, setForm,
    formErrors,
    campo, guardar,
  } = useEditarIncidencia(id)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencia...
    </div>
  )

  // Bloqueo total si tiene un reemplazo activo -- mismo criterio que ya
  // deshabilita el botón "Editar" en el detalle. Esta pantalla solo se
  // alcanza saltando ese botón por URL directa; antes mostraba un
  // formulario "restringido" que el backend igual rechazaba por completo
  // (Regla 2 de actualizarIncidencia.ts no admite ninguna excepción) --
  // UX-INC-001, confirmado en vivo 25/08/2026.
  if (tieneReemplazo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
            Editar incidencia
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-warning-bg, #fefce8)", border: "1px solid var(--color-warning, #ca8a04)", fontSize: "var(--text-sm)", color: "var(--color-warning-text, #854d0e)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Esta incidencia no se puede editar: tiene un reemplazo activo registrado en sus clases. Si necesitás modificarla, primero quitá el reemplazo desde el detalle de la incidencia.
        </div>
        <div>
          <button
            onClick={() => router.push(`/protected/dashboard/incidencias/${id}`)}
            style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
          >
            Ir al detalle de la incidencia
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Editar incidencia
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Podés modificar el tipo, las fechas y la observación.
        </p>
      </div>
      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
        </div>
      )}
      <EditarIncidenciaForm
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        codigarios={codigarios}
        items={items}
        loadingItems={loadingItems}
        guardando={guardando}
        campo={campo}
        onGuardar={async () => {
          const ok = await guardar()
          if (ok) router.push(`/protected/dashboard/incidencias/${id}`)
        }}
        onCancelar={() => router.back()}
      />
    </div>
  )
}