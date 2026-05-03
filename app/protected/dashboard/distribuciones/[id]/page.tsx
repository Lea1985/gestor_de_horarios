// app/protected/dashboard/distribuciones/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Distribucion = {
  id:                    number
  version:               number
  fecha_vigencia_desde:  string
  fecha_vigencia_hasta:  string | null
  estado:                string
  asignacion: {
    identificadorEstructural: string
    agente?: { nombre: string; apellido: string }
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

function ModalConfirmar({ onConfirmar, onCancelar }: { onConfirmar: () => void; onCancelar: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar eliminación</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>¿Eliminar esta distribución? Se eliminarán también sus módulos asociados.</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
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
  const [error,       setError]       = useState<string | null>(null)
  const [formErrors,  setFormErrors]  = useState<{ desde?: string }>({})

  const [form, setForm] = useState({
    fecha_vigencia_desde: "",
    fecha_vigencia_hasta: "",
  })

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  useEffect(() => {
    if (!id || authHeaders.Authorization === "Bearer ") return
    fetch(`/api/distribuciones/${id}`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        setDist(data)
        setForm({
          fecha_vigencia_desde: data.fecha_vigencia_desde.slice(0, 10),
          fecha_vigencia_hasta: data.fecha_vigencia_hasta?.slice(0, 10) ?? "",
        })
      })
      .catch(() => setError("Error cargando distribución"))
      .finally(() => setLoading(false))
  }, [id, authHeaders.Authorization])

  async function guardar() {
    if (!form.fecha_vigencia_desde) { setFormErrors({ desde: "Requerido" }); return }
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/distribuciones/${id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          fecha_vigencia_desde: form.fecha_vigencia_desde,
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

  async function eliminar() {
    try {
      const res = await fetch(`/api/distribuciones/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error eliminando"); return }
      router.push("/protected/dashboard/distribuciones")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmar(false)
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

  return (
    <>
      {confirmar && <ModalConfirmar onConfirmar={eliminar} onCancelar={() => setConfirmar(false)} />}

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
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Distribución v{dist.version}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{dist.asignacion.identificadorEstructural}</span>
              {dist.asignacion.agente && (
                <span> · {dist.asignacion.agente.apellido}, {dist.asignacion.agente.nombre}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setConfirmar(true)}
            style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
          >
            Eliminar
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Formulario */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

            <div>
              <label style={s.label}>Vigencia desde <span style={{ color: "var(--color-error)" }}>*</span></label>
              <input
                type="date" value={form.fecha_vigencia_desde}
                onChange={e => { setForm(p => ({ ...p, fecha_vigencia_desde: e.target.value })); setFormErrors({}) }}
                style={{ ...s.input, ...(formErrors.desde ? { borderColor: "var(--color-error)" } : {}) }}
                onFocus={focusStyle} onBlur={blurStyle(!!formErrors.desde)}
              />
              {formErrors.desde && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.desde}</span>}
            </div>

            <div>
              <label style={s.label}>
                Vigencia hasta <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="date" value={form.fecha_vigencia_hasta}
                onChange={e => setForm(p => ({ ...p, fecha_vigencia_hasta: e.target.value }))}
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

      </div>
    </>
  )
}
