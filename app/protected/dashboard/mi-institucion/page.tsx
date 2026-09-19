// app/protected/dashboard/mi-institucion/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

type Institucion = {
  id:        number
  nombre:    string
  dominio:   string | null
  domicilio: string | null
  telefono:  string | null
  email:     string | null
  cuit:      string | null
  estado:    string
  createdAt: string
}

type FormData = {
  nombre:    string
  domicilio: string
  telefono:  string
  email:     string
}

const CAMPOS: { key: keyof FormData; label: string; required?: boolean }[] = [
  { key: "nombre",    label: "Nombre",    required: true },
  { key: "domicilio", label: "Domicilio" },
  { key: "telefono",  label: "Teléfono" },
  { key: "email",     label: "Email" },
]

const s = {
  label: { fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const, color: "var(--color-text-primary)", display: "block" as const, marginBottom: "var(--space-1)" },
  input: { width: "100%", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", outline: "none" },
  inputDisabled: { background: "var(--color-surface-raised)", color: "var(--color-text-hint)", cursor: "not-allowed" as const },
  infoLabel: { fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)" as const, color: "var(--color-text-secondary)", display: "block" as const, marginBottom: "var(--space-1)" },
  infoValue: { fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" as const },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }
function blurStyle(e: React.FocusEvent<HTMLInputElement>, hasError?: boolean) { e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"; e.target.style.boxShadow = "none" }

export default function MiInstitucionPage() {
  const { authHeaders } = useAuth()

  const [institucion, setInstitucion] = useState<Institucion | null>(null)
  const [loading,      setLoading]    = useState(true)
  const [loadError,    setLoadError]  = useState<string | null>(null)
  const [error,        setError]      = useState<string | null>(null)
  const [guardando,    setGuardando]  = useState(false)
  const [guardado,     setGuardado]   = useState(false)

  const [form,       setForm]       = useState<FormData>({ nombre: "", domicilio: "", telefono: "", email: "" })
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    fetch("/api/mi-institucion", { headers: authHeaders, cache: "no-store" })
      .then(async res => {
        if (!res.ok) throw new Error()
        const data: Institucion = await res.json()
        setInstitucion(data)
        setForm({
          nombre:    data.nombre,
          domicilio: data.domicilio ?? "",
          telefono:  data.telefono ?? "",
          email:     data.email ?? "",
        })
      })
      .catch(() => setLoadError("Error cargando datos de la institución"))
      .finally(() => setLoading(false))
  }, [authHeaders.Authorization])

  function validar(): boolean {
    const errors: Partial<FormData> = {}
    CAMPOS.filter(c => c.required).forEach(c => {
      if (!form[c.key].trim()) errors[c.key] = "Campo requerido"
    })
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true); setError(null); setGuardado(false)
    try {
      const res  = await fetch("/api/mi-institucion", { method: "PATCH", headers: authHeaders, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error guardando los datos")
        return
      }
      setInstitucion(data)
      setGuardado(true)
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando datos de la institución...
    </div>
  )

  if (loadError || !institucion) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      {loadError ?? "Institución no encontrada"}
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>

      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Mi institución</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Estos datos se imprimen en el encabezado de los reportes PDF.
        </p>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>Datos generales</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          {CAMPOS.map(({ key, label, required }) => (
            <div key={key} style={{ gridColumn: key === "nombre" ? "1 / -1" : undefined }}>
              <label htmlFor={`field-${key}`} style={s.label}>
                {label}{required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
              </label>
              <input
                id={`field-${key}`}
                value={form[key]}
                onChange={e => { setForm(prev => ({ ...prev, [key]: e.target.value })); if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined })) }}
                style={{ ...s.input, ...(formErrors[key] ? { borderColor: "var(--color-error)" } : {}) }}
                onFocus={focusStyle}
                onBlur={e => blurStyle(e, Boolean(formErrors[key]))}
              />
              {formErrors[key] && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors[key]}</span>}
            </div>
          ))}

          <div>
            <label htmlFor="field-cuit" style={s.label}>
              CUIT <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(no editable acá)</span>
            </label>
            <input
              id="field-cuit"
              value={institucion.cuit ?? ""}
              placeholder="—"
              disabled
              readOnly
              style={{ ...s.input, ...s.inputDisabled }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end", alignItems: "center" }}>
          {guardado && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success-text)", fontWeight: "var(--font-medium)" }}>✓ Guardado</span>}
          <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>Información</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
          <div>
            <span style={s.infoLabel}>Estado</span>
            <div style={s.infoValue}>
              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)", background: institucion.estado === "ACTIVO" ? "var(--color-success-bg)" : "var(--color-error-bg)", color: institucion.estado === "ACTIVO" ? "var(--color-success-text)" : "var(--color-error-text)" }}>
                {institucion.estado}
              </span>
            </div>
          </div>
          <div><span style={s.infoLabel}>Dominio</span><div style={s.infoValue}>{institucion.dominio ?? "—"}</div></div>
          <div><span style={s.infoLabel}>Creada</span><div style={s.infoValue}>{institucion.createdAt?.slice(0, 10) ?? "—"}</div></div>
        </div>
      </div>

    </div>
  )
}
