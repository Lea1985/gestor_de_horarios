// app/protected/dashboard/incidencias/editar/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

type Codigario = { id: number; nombre: string }
type Item      = { id: number; codigo: string; nombre: string }

type FormData = {
  codigarioId:     string
  codigarioItemId: string
  fecha_desde:     string
  fecha_hasta:     string
  observacion:     string
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

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}

export default function EditarIncidenciaPage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()
  const params          = useParams()
  const id              = params.id as string

  const [loading,      setLoading]      = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [codigarios,   setCodigarios]   = useState<Codigario[]>([])
  const [items,        setItems]        = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [formErrors,   setFormErrors]   = useState<Partial<FormData>>({})

  const [form, setForm] = useState<FormData>({
    codigarioId: "", codigarioItemId: "",
    fecha_desde: "", fecha_hasta: "", observacion: "",
  })

  // ── Carga inicial ────────────────────────────────────────────

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return

    async function cargar() {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/incidencias/${id}`, { headers: authHeaders }),
          fetch(`/api/codigarios`,        { headers: authHeaders }),
        ])
        if (!r1.ok || !r2.ok) throw new Error()

        const incidencia = await r1.json()
        const catalogos  = await r2.json()

        setCodigarios(catalogos)
        setForm({
          codigarioId:     incidencia.codigarioItem?.codigarioId?.toString() ?? "",
          codigarioItemId: incidencia.codigarioItemId?.toString() ?? "",
          fecha_desde:     incidencia.fecha_desde.slice(0, 10),
          fecha_hasta:     incidencia.fecha_hasta.slice(0, 10),
          observacion:     incidencia.observacion ?? "",
        })
      } catch {
        setError("Error cargando incidencia")
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [authHeaders.Authorization])

  // ── Cargar items cuando cambia el codigario ──────────────────

  useEffect(() => {
    if (!form.codigarioId) { setItems([]); return }

    setLoadingItems(true)
    fetch(`/api/codigarios/${form.codigarioId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [form.codigarioId])

  // ── Helpers ──────────────────────────────────────────────────

  function campo<K extends keyof FormData>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
    setFormErrors(p => ({ ...p, [key]: undefined }))
  }

  function validar(): boolean {
    const err: Partial<FormData> = {}
    if (!form.codigarioId)     err.codigarioId     = "Requerido"
    if (!form.codigarioItemId) err.codigarioItemId = "Requerido"
    if (!form.fecha_desde)     err.fecha_desde     = "Requerido"
    if (!form.fecha_hasta)     err.fecha_hasta     = "Requerido"
    setFormErrors(err)
    return Object.keys(err).length === 0
  }

  // ── Guardar ──────────────────────────────────────────────────

  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    setError(null)

    try {
      const res = await fetch(`/api/incidencias/${id}`, {
        method:  "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          codigarioItemId: Number(form.codigarioItemId),
          fecha_desde:     form.fecha_desde,
          fecha_hasta:     form.fecha_hasta,
          observacion:     form.observacion || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error actualizando"); return }

      router.push("/protected/dashboard/incidencias")
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencia...
    </div>
  )

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/protected/dashboard/incidencias")}
          style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Editar incidencia
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Solo podés modificar el tipo, las fechas y la observación
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

      {/* Formulario */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

          {/* Codigario */}
          <div>
            <label style={s.label}>Tipo de incidencia <span style={{ color: "var(--color-error)" }}>*</span></label>
            <select
              value={form.codigarioId}
              onChange={e => { campo("codigarioId", e.target.value); setForm(p => ({ ...p, codigarioItemId: "" })) }}
              style={{ ...s.input, ...(formErrors.codigarioId ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle} onBlur={blurStyle(!!formErrors.codigarioId)}
            >
              <option value="">Seleccionar catálogo...</option>
              {codigarios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {formErrors.codigarioId && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.codigarioId}</span>}
          </div>

          {/* Item */}
          <div>
            <label style={s.label}>Código <span style={{ color: "var(--color-error)" }}>*</span></label>
            <select
              value={form.codigarioItemId}
              onChange={e => campo("codigarioItemId", e.target.value)}
              disabled={!form.codigarioId || loadingItems}
              style={{
                ...s.input,
                ...(formErrors.codigarioItemId ? { borderColor: "var(--color-error)" } : {}),
                opacity: (!form.codigarioId || loadingItems) ? 0.5 : 1,
              }}
              onFocus={focusStyle} onBlur={blurStyle(!!formErrors.codigarioItemId)}
            >
              <option value="">
                {loadingItems ? "Cargando..." : !form.codigarioId ? "Primero seleccioná un catálogo" : "Seleccionar código..."}
              </option>
              {items.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>)}
            </select>
            {formErrors.codigarioItemId && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.codigarioItemId}</span>}
          </div>

          {/* Fecha desde */}
          <div>
            <label style={s.label}>Fecha desde <span style={{ color: "var(--color-error)" }}>*</span></label>
            <input
              type="date" value={form.fecha_desde}
              onChange={e => campo("fecha_desde", e.target.value)}
              style={{ ...s.input, ...(formErrors.fecha_desde ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle} onBlur={blurStyle(!!formErrors.fecha_desde)}
            />
            {formErrors.fecha_desde && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.fecha_desde}</span>}
          </div>

          {/* Fecha hasta */}
          <div>
            <label style={s.label}>Fecha hasta <span style={{ color: "var(--color-error)" }}>*</span></label>
            <input
              type="date" value={form.fecha_hasta}
              onChange={e => campo("fecha_hasta", e.target.value)}
              style={{ ...s.input, ...(formErrors.fecha_hasta ? { borderColor: "var(--color-error)" } : {}) }}
              onFocus={focusStyle} onBlur={blurStyle(!!formErrors.fecha_hasta)}
            />
            {formErrors.fecha_hasta && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.fecha_hasta}</span>}
          </div>

          {/* Observación */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={s.label}>
              Observación <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={form.observacion}
              onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
              rows={3}
              style={{ ...s.input, resize: "vertical" }}
              onFocus={focusStyle} onBlur={blurStyle(false)}
              placeholder="Ej: Certificado médico presentado"
            />
          </div>

        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
          <button
            onClick={() => router.push("/protected/dashboard/incidencias")}
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
  )
}
