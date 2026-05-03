// app/protected/dashboard/distribuciones/page.tsx
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────

type Distribucion = {
  id:                    number
  asignacionId:          number
  version:               number
  fecha_vigencia_desde:  string
  fecha_vigencia_hasta:  string | null
  estado:                string
  asignacion: {
    identificadorEstructural: string
    agente?: { nombre: string; apellido: string }
    curso?:  { nombre: string } | null
    turno?:  { nombre: string } | null
  }
}

type Asignacion = {
  id:                       number
  identificadorEstructural: string
  agente: { nombre: string; apellido: string }
  curso:  { nombre: string } | null
  turno:  { nombre: string } | null
}

type FormData = {
  asignacionId:         string
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
}

const FORM_VACIO: FormData = {
  asignacionId: "", fecha_vigencia_desde: "", fecha_vigencia_hasta: "",
}

// ── Estilos ───────────────────────────────────────────────────

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
  th: {
    textAlign: "left" as const, fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "var(--color-text-secondary)",
    padding: "10px 12px", borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)", verticalAlign: "middle" as const,
  },
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--color-accent)"
  e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)"
}

function blurStyle(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = hasError ? "var(--color-error)" : "var(--color-border)"
    e.target.style.boxShadow   = "none"
  }
}

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }} onClick={onCancelar}>
      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Confirmar acción</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>{mensaje}</p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function Badge({ estado }: { estado: string }) {
  const activo = estado === "ACTIVO"
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)",
      fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
      background: activo ? "var(--color-success-bg)" : "var(--color-surface-raised)",
      color:      activo ? "var(--color-success-text)" : "var(--color-text-secondary)",
    }}>
      {estado}
    </span>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function DistribucionesPage() {
  const { authHeaders } = useAuth()

  const [distribuciones, setDistribuciones] = useState<Distribucion[]>([])
  const [asignaciones,   setAsignaciones]   = useState<Asignacion[]>([])
  const [loading,        setLoading]        = useState(true)
  const [mostrarForm,    setMostrarForm]     = useState(false)
  const [guardando,      setGuardando]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [form,           setForm]           = useState<FormData>(FORM_VACIO)
  const [formErrors,     setFormErrors]     = useState<Partial<FormData>>({})
  const [confirmarId,    setConfirmarId]    = useState<number | null>(null)
  const [expandidos,     setExpandidos]     = useState<Set<number>>(new Set())

  async function cargar() {
    try {
      setLoading(true)
      const [r1, r2] = await Promise.all([
        fetch("/api/distribuciones", { headers: authHeaders }),
        fetch("/api/asignaciones",   { headers: authHeaders }),
      ])
      if (!r1.ok || !r2.ok) throw new Error()
      setDistribuciones(await r1.json())
      setAsignaciones(await r2.json())
    } catch {
      setError("Error cargando datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargar()
  }, [authHeaders.Authorization])

  // ── Agrupar distribuciones por asignación ─────────────────

  const grupos = useMemo(() => {
    const map = new Map<number, Distribucion[]>()
    for (const d of distribuciones) {
      const lista = map.get(d.asignacionId) ?? []
      lista.push(d)
      map.set(d.asignacionId, lista)
    }
    // Ordenar versiones dentro de cada grupo desc
    for (const lista of map.values()) {
      lista.sort((a, b) => b.version - a.version)
    }
    return map
  }, [distribuciones])

  // ── Próxima versión automática para la asignación elegida ──

  const proximaVersion = useMemo(() => {
    if (!form.asignacionId) return 1
    const lista = grupos.get(Number(form.asignacionId)) ?? []
    if (lista.length === 0) return 1
    return Math.max(...lista.map(d => d.version)) + 1
  }, [form.asignacionId, grupos])

  // ── Form ──────────────────────────────────────────────────

  function campo<K extends keyof FormData>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }))
    setFormErrors(p => ({ ...p, [key]: undefined }))
  }

  function validar(): boolean {
    const err: Partial<FormData> = {}
    if (!form.asignacionId)         err.asignacionId         = "Requerido"
    if (!form.fecha_vigencia_desde) err.fecha_vigencia_desde = "Requerido"
    setFormErrors(err)
    return Object.keys(err).length === 0
  }

  async function crear() {
    if (!validar()) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch("/api/distribuciones", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          asignacionId:         Number(form.asignacionId),
          version:              proximaVersion,
          fecha_vigencia_desde: form.fecha_vigencia_desde,
          fecha_vigencia_hasta: form.fecha_vigencia_hasta || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error creando"); return }
      setForm(FORM_VACIO)
      setMostrarForm(false)
      await cargar()
      // Expandir el grupo de la asignación recién creada
      setExpandidos(prev => new Set([...prev, Number(form.asignacionId)]))
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/distribuciones/${id}`, { method: "DELETE", headers: authHeaders })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error eliminando"); return }
      await cargar()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  function toggleExpandido(asignacionId: number) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(asignacionId) ? next.delete(asignacionId) : next.add(asignacionId)
      return next
    })
  }

  // ── Loading ───────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando distribuciones...
    </div>
  )

  const asignacionesConDist  = Array.from(grupos.keys())
  const asignacionesSinDist  = asignaciones.filter(a => !grupos.has(a.id))

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta distribución horaria? Se eliminarán también sus módulos asociados."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Distribuciones horarias
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {distribuciones.length} distribución{distribuciones.length !== 1 ? "es" : ""} · {asignacionesConDist.length} asignación{asignacionesConDist.length !== 1 ? "es" : ""} con horario
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={() => { setMostrarForm(true); setForm(FORM_VACIO); setFormErrors({}); setError(null) }}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nueva distribución
            </button>
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

        {/* Formulario */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 560 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              Nueva distribución
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>Asignación <span style={{ color: "var(--color-error)" }}>*</span></label>
                <select
                  value={form.asignacionId}
                  onChange={e => campo("asignacionId", e.target.value)}
                  style={{ ...s.input, ...(formErrors.asignacionId ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={focusStyle} onBlur={blurStyle(!!formErrors.asignacionId)}
                >
                  <option value="">Seleccionar asignación...</option>
                  {asignaciones
                    .sort((a, b) => a.identificadorEstructural.localeCompare(b.identificadorEstructural))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.identificadorEstructural} — {a.agente.apellido}, {a.agente.nombre}
                        {a.curso ? ` (${a.curso.nombre})` : ""}
                      </option>
                    ))
                  }
                </select>
                {formErrors.asignacionId && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.asignacionId}</span>}
              </div>

              {/* Versión calculada automáticamente */}
              {form.asignacionId && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", padding: "6px 10px", background: "var(--color-surface-raised)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    Se creará la <strong>versión {proximaVersion}</strong>
                    {proximaVersion > 1 ? ` (la asignación ya tiene ${proximaVersion - 1} versión${proximaVersion - 1 !== 1 ? "es" : ""})` : " (primera versión)"}
                  </p>
                </div>
              )}

              <div>
                <label style={s.label}>Vigencia desde <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input
                  type="date" value={form.fecha_vigencia_desde}
                  onChange={e => campo("fecha_vigencia_desde", e.target.value)}
                  style={{ ...s.input, ...(formErrors.fecha_vigencia_desde ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={focusStyle} onBlur={blurStyle(!!formErrors.fecha_vigencia_desde)}
                />
                {formErrors.fecha_vigencia_desde && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors.fecha_vigencia_desde}</span>}
              </div>

              <div>
                <label style={s.label}>
                  Vigencia hasta <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="date" value={form.fecha_vigencia_hasta}
                  onChange={e => campo("fecha_vigencia_hasta", e.target.value)}
                  style={s.input}
                  onFocus={focusStyle} onBlur={blurStyle(false)}
                />
              </div>

            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setMostrarForm(false); setForm(FORM_VACIO); setFormErrors({}); setError(null) }}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={crear}
                disabled={guardando}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? "Creando..." : "Crear distribución"}
              </button>
            </div>
          </div>
        )}

        {/* Lista agrupada por asignación */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>

          {distribuciones.length === 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-12)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
              No hay distribuciones registradas
            </div>
          )}

          {Array.from(grupos.entries()).map(([asignacionId, lista]) => {
            const expandido  = expandidos.has(asignacionId)
            const activa     = lista.find(d => d.estado === "ACTIVO")
            const primera    = lista[0] // versión más alta (ya ordenado desc)
            const asignacion = lista[0].asignacion

            return (
              <div
                key={asignacionId}
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}
              >
                {/* Cabecera del grupo */}
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", borderBottom: expandido ? "1px solid var(--color-border)" : "none" }}
                  onClick={() => toggleExpandido(asignacionId)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", userSelect: "none" as const }}>
                      {expandido ? "▾" : "▸"}
                    </span>
                    <div>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                        {asignacion.identificadorEstructural}
                      </span>
                      {asignacion.agente && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", marginLeft: "var(--space-2)" }}>
                          {asignacion.agente.apellido}, {asignacion.agente.nombre}
                        </span>
                      )}
                      {asignacion.curso && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)", marginLeft: "var(--space-2)" }}>
                          · {asignacion.curso.nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    {activa && <Badge estado="ACTIVO" />}
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                      {lista.length} versión{lista.length !== 1 ? "es" : ""}
                    </span>
                    {/* Acceso rápido a la versión activa/última sin expandir */}
                    {!expandido && (
                      <div style={{ display: "flex", gap: "var(--space-2)" }} onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/protected/dashboard/distribuciones/${primera.id}/modulos`}
                          style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", textDecoration: "none" }}
                        >
                          Módulos →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de versiones (expandible) */}
                {expandido && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Versión", "Estado", "Vigencia desde", "Vigencia hasta", ""].map(col => (
                          <th key={col} style={s.th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map(d => (
                        <tr
                          key={d.id}
                          style={{ transition: "background 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={s.td}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>v{d.version}</span>
                          </td>
                          <td style={s.td}><Badge estado={d.estado} /></td>
                          <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                            {d.fecha_vigencia_desde.slice(0, 10)}
                          </td>
                          <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                            {d.fecha_vigencia_hasta?.slice(0, 10) ?? <span style={{ color: "var(--color-text-hint)" }}>Indefinida</span>}
                          </td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: "var(--space-3)" }}>
                              <Link
                                href={`/protected/dashboard/distribuciones/${d.id}/modulos`}
                                style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", textDecoration: "none" }}
                              >
                                Módulos
                              </Link>
                              <Link
                                href={`/protected/dashboard/distribuciones/${d.id}`}
                                style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", cursor: "pointer", textDecoration: "none" }}
                              >
                                Editar
                              </Link>
                              <button
                                onClick={() => setConfirmarId(d.id)}
                                style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>

        {/* Asignaciones sin distribución */}
        {asignacionesSinDist.length > 0 && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
              Sin distribución asignada ({asignacionesSinDist.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--space-2)", padding: "var(--space-4)" }}>
              {asignacionesSinDist.map(a => (
                <span
                  key={a.id}
                  style={{ fontSize: "var(--text-xs)", padding: "3px 8px", borderRadius: "var(--radius-sm)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text-hint)", fontFamily: "var(--font-mono)" }}
                >
                  {a.identificadorEstructural}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
