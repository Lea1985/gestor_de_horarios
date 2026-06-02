// app/protected/dashboard/calendario-escolar/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ────────────────────────────────────────────────────
type PeriodoOperativo = {
  id:          number
  nombre:      string
  fecha_desde: string
  fecha_hasta: string
  vigente:     boolean
}

type CalendarioEscolar = {
  id:             number
  fecha:          string
  descripcion:    string
  esFeriado:      boolean
  suspendeClases: boolean
  estado:         string
  activo:         boolean
  deletedAt:      string | null
}

type FormData = {
  fecha:          string
  descripcion:    string
  esFeriado:      boolean
  suspendeClases: boolean
}

// ── Configuración ────────────────────────────────────────────
const FORM_VACIO: FormData = {
  fecha:          "",
  descripcion:    "",
  esFeriado:      false,
  suspendeClases: false,
}

// ── Estilos compartidos ──────────────────────────────────────
const s = {
  label: {
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-medium)" as const,
    color:        "var(--color-text-primary)",
    display:      "block" as const,
    marginBottom: "var(--space-1)",
  },
  input: {
    width:        "100%",
    background:   "var(--color-surface)",
    border:       "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding:      "8px 12px",
    fontSize:     "var(--text-sm)",
    color:        "var(--color-text-primary)",
    outline:      "none",
  },
  inputError: { borderColor: "var(--color-error)" },
  th: {
    textAlign:     "left" as const,
    fontSize:      "var(--text-2xs)",
    fontWeight:    "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color:         "var(--color-text-secondary)",
    padding:       "10px 12px",
    borderBottom:  "1px solid var(--color-border-strong)",
    background:    "var(--color-surface-raised)",
  },
  td: {
    padding:       "10px 12px",
    fontSize:      "var(--text-sm)",
    color:         "var(--color-text-primary)",
    borderBottom:  "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}

// ── Modal confirmación ───────────────────────────────────────
function ModalConfirmar({
  mensaje,
  onConfirmar,
  onCancelar,
}: {
  mensaje:     string
  onConfirmar: () => void
  onCancelar:  () => void
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: "var(--z-modal)",
      }}
      onClick={onCancelar}
    >
      <div
        style={{
          background: "var(--color-surface)", borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)", maxWidth: 360, width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
          Confirmar acción
        </h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancelar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────
export default function CalendarioEscolarPage() {
  const { authHeaders } = useAuth()

  const [periodoActivo,  setPeriodoActivo]  = useState<PeriodoOperativo | null | undefined>(undefined)
  const [eventos,        setEventos]        = useState<CalendarioEscolar[]>([])
  const [loading,        setLoading]        = useState(true)
  const [mostrarForm,    setMostrarForm]    = useState(false)
  const [editando,       setEditando]       = useState<number | null>(null)
  const [form,           setForm]           = useState<FormData>(FORM_VACIO)
  const [error,          setError]          = useState<string | null>(null)
  const [guardando,      setGuardando]      = useState(false)
  const [confirmarId,    setConfirmarId]    = useState<number | null>(null)
  const [busqueda,       setBusqueda]       = useState("")
  const [verEliminados,  setVerEliminados]  = useState(false)

  // ── Filtrado ───────────────────────────────────────────────
  const eventosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return eventos
    const q = busqueda.toLowerCase()
    return eventos.filter(e => e.descripcion.toLowerCase().includes(q))
  }, [eventos, busqueda])

  // ── Carga período activo ───────────────────────────────────
  async function cargarPeriodoActivo() {
    try {
      const res = await fetch("/api/periodos-operativos/activo", {
        headers: authHeaders,
        cache: "no-store",
      })
      if (res.status === 404) {
        setPeriodoActivo(null)
        return
      }
      if (!res.ok) throw new Error()
      setPeriodoActivo(await res.json())
    } catch {
      setError("Error cargando período operativo")
      setPeriodoActivo(null)
    }
  }

  // ── Carga eventos ──────────────────────────────────────────
  async function cargarEventos() {
    try {
      const params = new URLSearchParams({
        inactivos: String(verEliminados),
        ...(periodoActivo ? { periodoOperativoId: String(periodoActivo.id) } : {}),
      })
      const res = await fetch(`/api/calendario-escolar?${params}`, {
        headers: authHeaders,
        cache: "no-store",
      })
      if (!res.ok) throw new Error()
      setEventos(await res.json())
    } catch {
      setError("Error cargando calendario escolar")
    } finally {
      setLoading(false)
    }
  }

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarPeriodoActivo()
  }, [authHeaders.Authorization])

  // Solo carga eventos una vez que periodoActivo se resolvió (null o un objeto)
  useEffect(() => {
    if (periodoActivo !== undefined) cargarEventos()
  }, [periodoActivo, verEliminados])

  // ── Form ───────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_VACIO)
    setEditando(null)
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(evento: CalendarioEscolar) {
    setForm({
      fecha:          evento.fecha.split("T")[0],
      descripcion:    evento.descripcion,
      esFeriado:      evento.esFeriado,
      suspendeClases: evento.suspendeClases,
    })
    setEditando(evento.id)
    setMostrarForm(true)
    setError(null)
  }

  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setError(null)
  }

  // ── Validación ─────────────────────────────────────────────
  function validar() {
    if (!form.fecha.trim() || !form.descripcion.trim()) {
      setError("Fecha y descripción son obligatorias")
      return false
    }
    return true
  }

  // ── Guardar ────────────────────────────────────────────────
  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    setError(null)
    try {
      const url    = editando ? `/api/calendario-escolar/${editando}` : "/api/calendario-escolar"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          // Solo en creación: el período viene del contexto activo
          ...(!editando && periodoActivo
            ? { periodoOperativoId: periodoActivo.id }
            : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando evento")
        return
      }
      await cargarEventos()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────
  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/calendario-escolar/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando evento")
        return
      }
      await cargarEventos()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }

  // ── Reactivar ──────────────────────────────────────────────
  async function reactivar(id: number) {
    try {
      const res = await fetch(`/api/calendario-escolar/${id}/reactivar`, {
        method: "POST",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error reactivando evento")
        return
      }
      await cargarEventos()
    } catch {
      setError("Error de red")
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
        Cargando calendario escolar...
      </div>
    )
  }

  // ── Sin período activo ─────────────────────────────────────
  if (!periodoActivo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", textAlign: "center" }}>
        <span style={{ fontSize: "var(--text-base)", color: "var(--color-text-primary)", fontWeight: "var(--font-medium)" }}>
          No hay período operativo vigente
        </span>
        <span>
          Establecé un período vigente desde{" "}
          <a href="/protected/dashboard/periodos-operativos" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
            Períodos Operativos
          </a>{" "}
          para gestionar el calendario.
        </span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este evento? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Calendario Escolar
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {periodoActivo.nombre}
              {" · "}
              {periodoActivo.fecha_desde.slice(0, 10).split("-").reverse().join("/")}
              {" → "}
              {periodoActivo.fecha_hasta.slice(0, 10).split("-").reverse().join("/")}
              {" · "}
              {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nuevo evento
            </button>
          )}
        </div>

        {/* Error global */}
        {error && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}
            role="alert"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}
              aria-label="Cerrar"
            >×</button>
          </div>
        )}

        {/* Formulario inline */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 520 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editando ? "Editar evento" : "Nuevo evento"}
            </h2>

            <div style={{ display: "grid", gap: "var(--space-4)" }}>

              <div>
                <label style={s.label}>
                  Fecha <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                  style={s.input}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                />
              </div>

              <div>
                <label style={s.label}>
                  Descripción <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  style={s.input}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.esFeriado}
                    onChange={e => setForm(prev => ({ ...prev, esFeriado: e.target.checked }))}
                    style={{ cursor: "pointer" }}
                  />
                  Es feriado
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.suspendeClases}
                    onChange={e => setForm(prev => ({ ...prev, suspendeClases: e.target.checked }))}
                    style={{ cursor: "pointer" }}
                  />
                  Suspende clases
                </label>
              </div>

            </div>

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button
                onClick={cancelar}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
                aria-busy={guardando}
              >
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear evento"}
              </button>
            </div>
          </div>
        )}

        {/* Buscador + toggle */}
        {!mostrarForm && (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <input
              placeholder="Buscar por descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ ...s.input, flex: 1 }}
              onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
              onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              <input
                type="checkbox"
                checked={verEliminados}
                onChange={e => setVerEliminados(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Ver eliminados
            </label>
          </div>
        )}

        {/* Tabla */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Descripción</th>
                <th style={s.th}>Feriado</th>
                <th style={s.th}>Suspende clases</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    No hay eventos{verEliminados ? " eliminados" : ""} registrados
                  </td>
                </tr>
              ) : eventosFiltrados.map(evento => {
                const eliminado = !!evento.deletedAt
                return (
                  <tr
                    key={evento.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                            {evento.fecha.slice(0, 10).split("-").reverse().join("/")}          
                    </td>
                    <td style={s.td}>
                      {evento.descripcion}
                      {eliminado && (
                        <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                          Eliminado
                        </span>
                      )}
                    </td>
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                      {evento.esFeriado ? "Sí" : "No"}
                    </td>
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                      {evento.suspendeClases ? "Sí" : "No"}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        {eliminado ? (
                          <button
                            onClick={() => reactivar(evento.id)}
                            style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                          >
                            Restaurar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => abrirEditar(evento)}
                              style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmarId(evento.id)}
                              style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}