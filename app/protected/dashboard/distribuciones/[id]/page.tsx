// app/protected/dashboard/distribuciones/[id]/page.tsx
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { ModalConfirmar } from "@/features/distribuciones"
type Distribucion = {
  id:                    number
  version:               number
  fecha_vigencia_desde:  string
  fecha_vigencia_hasta:  string | null
  estado:                string
  deletedAt:             string | null
  puedeEliminar:         boolean
  motivoBloqueoEliminar: string | null
  asignacion: {
    identificadorEstructural: string
    titularidades?: { agente: { nombre: string; apellido: string } }[]
    unidad?:   { nombre: string } | null
    materia?:  { nombre: string } | null
    comision?: { nombre: string; curso: { nombre: string } } | null
  }
}
const s = {
  label: {
    fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)", display: "block" as const, marginBottom: "var(--space-1)",
  },
  input: {
    width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)", outline: "none",
  },
  readOnly: {
    width: "100%", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)",
    color: "var(--color-text-secondary)",
  },
}
function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}
function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}

export default function EditarDistribucionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const [id,          setId]          = useState("")
  const [dist,        setDist]        = useState<Distribucion | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [guardando,   setGuardando]   = useState(false)
  const [confirmar,   setConfirmar]   = useState(false)
  const [confirmarReactivar, setConfirmarReactivar] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  // UX-DIS-002: "Vigencia desde" quedó como input editable pero el backend
  // (actualizarDistribucion.ts) nunca procesa ese campo: cambiarla implicaría
  // reubicar clases ya generadas, algo que no está implementado. El campo se
  // mostraba editable sin tener ningún efecto real. Se retira del form y se
  // muestra solo como dato informativo de solo lectura.
  const [form, setForm] = useState({
    fecha_vigencia_hasta: "",
  })
  useEffect(() => { params.then(p => setId(p.id)) }, [params])
  async function cargar() {
    if (!id || authHeaders.Authorization === "Bearer ") return
    const data = await fetch(`/api/distribuciones/${id}`, { headers: authHeaders }).then(r => r.json())
    setDist(data)
    setForm({
      fecha_vigencia_hasta: data.fecha_vigencia_hasta?.slice(0, 10) ?? "",
    })
  }
  useEffect(() => {
    if (!id || authHeaders.Authorization === "Bearer ") return
    cargar()
      .catch(() => setError("Error cargando distribución"))
      .finally(() => setLoading(false))
  }, [id, authHeaders.Authorization])
  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/distribuciones/${id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          fecha_vigencia_hasta: form.fecha_vigencia_hasta || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error guardando"); return }
      router.push("/protected/dashboard/distribuciones")
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }
  // UX-DIS-011/151: eliminar() simplificado -- ya no hay segundo paso con
  // tramo de reemplazo. El backend bloquea de entrada (409) si la
  // distribución no está ACTIVO o tiene incidencias asociadas; el botón
  // ya está deshabilitado en ese caso (ver dist.puedeEliminar), así que
  // llegar acá con un bloqueo debería ser raro -- se maneja igual por si
  // el estado cambió entre que se cargó la pantalla y que se confirmó.
  async function eliminar() {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/distribuciones/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error eliminando"); return }
      router.push("/protected/dashboard/distribuciones")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmar(false)
      setGuardando(false)
    }
  }
  // UX-DIS-008: reactivar una distribución eliminada. Recarga los datos
  // al terminar (en vez de navegar) para que la misma pantalla pase de
  // mostrar "Eliminada" a mostrar el formulario normal.
  async function reactivar() {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/distribuciones/${id}/reactivar`, {
        method:  "POST",
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error reactivando"); return }
      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarReactivar(false)
      setGuardando(false)
    }
  }
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando...
    </div>
  )
  if (!dist) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      Distribución no encontrada
    </div>
  )
  const esEliminada = !!dist.deletedAt
  return (
    <>
      {confirmar && (
        <ModalConfirmar onConfirmar={eliminar} onCancelar={() => setConfirmar(false)} guardando={guardando} />
      )}
      {confirmarReactivar && (
        <ModalConfirmar
          titulo="Confirmar reactivación"
          mensaje="¿Reactivar esta distribución?"
          labelConfirmar="Reactivar"
          destructivo={false}
          onConfirmar={reactivar}
          onCancelar={() => setConfirmarReactivar(false)}
          guardando={guardando}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <button
              onClick={() => router.push("/protected/dashboard/distribuciones")}
              style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
            >
              ← Volver
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
                Distribución v{dist.version}
              </h1>
              {esEliminada && (
                <span style={{ fontSize: "var(--text-2xs)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                  Eliminada
                </span>
              )}
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{dist.asignacion.identificadorEstructural}</span>
  {dist.asignacion.titularidades?.[0] && (
    <span> · {dist.asignacion.titularidades[0].agente.apellido}, {dist.asignacion.titularidades[0].agente.nombre}</span>
  )}
  {dist.asignacion.unidad && <span> · {dist.asignacion.unidad.nombre}</span>}
  {dist.asignacion.materia && <span> · {dist.asignacion.materia.nombre}</span>}
  {dist.asignacion.comision && <span> · {dist.asignacion.comision.curso.nombre} ({dist.asignacion.comision.nombre})</span>}
</p>
          </div>
          {esEliminada ? (
            <button
              onClick={() => setConfirmarReactivar(true)}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              Reactivar
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
              <button
                onClick={() => dist.puedeEliminar && setConfirmar(true)}
                disabled={!dist.puedeEliminar}
                title={dist.motivoBloqueoEliminar ?? undefined}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none",
                  background: dist.puedeEliminar ? "var(--color-error)" : "var(--color-surface-raised)",
                  color: dist.puedeEliminar ? "white" : "var(--color-text-hint)",
                  fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
                  cursor: dist.puedeEliminar ? "pointer" : "not-allowed",
                  opacity: dist.puedeEliminar ? 1 : 0.6,
                }}
              >
                Eliminar
              </button>
              {dist.motivoBloqueoEliminar && (
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                  {dist.motivoBloqueoEliminar}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}
        {/* Formulario — oculto si está eliminada, no tiene sentido editar vigencia de algo eliminado */}
        {!esEliminada && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div>
                <label style={s.label}>Vigencia desde</label>
                <div style={s.readOnly}>
                  {new Date(dist.fecha_vigencia_desde).toLocaleDateString("es-AR")}
                </div>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginTop: "var(--space-1)", display: "block" }}>
                  No se puede modificar una vez creada la distribución.
                </span>
              </div>
              <div>
                <label style={s.label}>
                  Vigencia hasta <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="date" value={form.fecha_vigencia_hasta}
                  onChange={e => setForm({ fecha_vigencia_hasta: e.target.value })}
                  style={s.input}
                  onFocus={focusStyle} onBlur={blurStyle(false)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button
                onClick={() => router.push("/protected/dashboard/distribuciones")}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}