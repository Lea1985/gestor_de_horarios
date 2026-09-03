// app/protected/dashboard/periodos-operativos/page.tsx
"use client"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import { AvisoPeriodoOperativo } from "@/features/periodosOperativos"
// ── Tipos ────────────────────────────────────────────────────
type EstadoPeriodo = "BORRADOR" | "ACTIVO" | "CERRADO"
type Periodo = {
  id:            number
  institucionId: number
  nombre:        string
  fecha_desde:   string
  fecha_hasta:   string
  estado:        EstadoPeriodo
  deletedAt:     string | null
  createdAt:     string
  updatedAt:     string
}
type FormData = {
  nombre:      string
  fecha_desde: string
  fecha_hasta: string
}


// ── Configuración de campos ──────────────────────────────────
const CAMPOS: { key: keyof FormData; label: string; required?: boolean }[] = [
  { key: "nombre",      label: "Nombre",          required: true },
  { key: "fecha_desde", label: "Fecha de inicio",  required: true },
  { key: "fecha_hasta", label: "Fecha de fin",     required: true },
]
const FORM_VACIO: FormData = { nombre: "", fecha_desde: "", fecha_hasta: "" }

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
// ── Modal de confirmación genérico ───────────────────────────
function ModalConfirmar({
  mensaje,
  textoConfirmar = "Eliminar",
  onConfirmar,
  onCancelar,
}: {
  mensaje:         string
  textoConfirmar?: string
  onConfirmar:     () => void
  onCancelar:      () => void
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
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
// ── Página principal ─────────────────────────────────────────
export default function PeriodosOperativosPage() {
  const { authHeaders } = useAuth()
  const [periodos,     setPeriodos]     = useState<Periodo[]>([])
  const [loading,      setLoading]      = useState(true)
  const [mostrarForm,  setMostrarForm]  = useState(false)
  const [editando,     setEditando]     = useState<number | null>(null)
  const [form,         setForm]         = useState<FormData>(FORM_VACIO)
  const [formErrors,   setFormErrors]   = useState<Partial<FormData>>({})
  const [error,        setError]        = useState<string | null>(null)
  const [guardando,    setGuardando]    = useState(false)
  const [confirmarId,  setConfirmarId]  = useState<number | null>(null)
  const [confirmarCierreId, setConfirmarCierreId] = useState<number | null>(null)
  const [busqueda,     setBusqueda]     = useState("")
  const [verEliminados, setVerEliminados] = useState(false)
  // ── Filtro client-side ─────────────────────────────────────
  const periodosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return periodos
    const q = busqueda.toLowerCase()
    return periodos.filter(p => p.nombre.toLowerCase().includes(q))
  }, [periodos, busqueda])
  // ── Período a cerrar + si el cierre es anticipado (UX-PER-002) ──
  // "Anticipado" = todavía queda tiempo hasta fecha_hasta: las clases
  // futuras dentro del período van a quedar SUSPENDIDA, no DICTADA.
  const periodoACerrar = useMemo(
    () => periodos.find(p => p.id === confirmarCierreId) ?? null,
    [periodos, confirmarCierreId]
  )
  const cierreAnticipado = useMemo(() => {
    if (!periodoACerrar) return false
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0)
    const hasta = new Date(periodoACerrar.fecha_hasta); hasta.setUTCHours(0, 0, 0, 0)
    return hasta > hoy
  }, [periodoACerrar])
  // ── Carga ──────────────────────────────────────────────────
  async function cargarPeriodos() {
    try {
      const res = await fetch(
        `/api/periodos-operativos?inactivos=${String(verEliminados)}`,
        { headers: authHeaders, cache: "no-store" }
      )
      if (!res.ok) throw new Error()
      setPeriodos(await res.json())
    } catch {
      setError("Error cargando períodos")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (authHeaders.Authorization !== "Bearer ") cargarPeriodos()
  }, [authHeaders.Authorization, verEliminados])
  // ── Form ───────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_VACIO)
    setFormErrors({})
    setEditando(null)
    setMostrarForm(true)
    setError(null)
  }
  function abrirEditar(p: Periodo) {
    setForm({
      nombre:      p.nombre,
      fecha_desde: p.fecha_desde.slice(0, 10),
      fecha_hasta: p.fecha_hasta.slice(0, 10),
    })
    setFormErrors({})
    setEditando(p.id)
    setMostrarForm(true)
    setError(null)
  }
  function cancelar() {
    setMostrarForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
  }
  // ── Validación ─────────────────────────────────────────────
  function validar(): boolean {
    const errors: Partial<FormData> = {}
    CAMPOS.filter(c => c.required).forEach(c => {
      if (!form[c.key].trim()) errors[c.key] = "Campo requerido"
    })
    if (
      form.fecha_desde && form.fecha_hasta &&
      new Date(form.fecha_desde) >= new Date(form.fecha_hasta)
    ) {
      errors.fecha_hasta = "La fecha de fin debe ser posterior a la de inicio"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  // ── Guardar ────────────────────────────────────────────────
  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    setError(null)
    try {
      const url    = editando ? `/api/periodos-operativos/${editando}` : "/api/periodos-operativos"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          nombre:      form.nombre,
          fecha_desde: new Date(form.fecha_desde),
          fecha_hasta: new Date(form.fecha_hasta),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error guardando período")
        return
      }
      await cargarPeriodos()
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }
  // ── Eliminar ───────────────────────────────────────────────
  // El backend rechaza eliminar un período ACTIVO (hay que cerrarlo antes).
  async function eliminar(id: number) {
    try {
      const res = await fetch(`/api/periodos-operativos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando período")
        return
      }
      await cargarPeriodos()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }
  const [avisoActivacion, setAvisoActivacion] = useState<string | null>(null)
  const [avisoCierre,     setAvisoCierre]     = useState<string | null>(null)
  // ── Activar (BORRADOR -> ACTIVO) ─────────────────────────────
  // El backend rechaza activar si ya hay otro período ACTIVO —
  // hay que cerrarlo primero. El mensaje de error ya viene armado
  // desde el backend (YaHayPeriodoActivoError), se muestra tal cual.
  async function activar(id: number) {
    try {
      const res = await fetch(`/api/periodos-operativos/${id}/activar`, {
        method: "POST",
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error activando período")
        return
      }
      setAvisoActivacion(
        data.distribucionesProcesadas > 0
          ? `Período activado. Se generaron ${data.clasesCreadas} clase${data.clasesCreadas !== 1 ? "s" : ""} para ${data.distribucionesProcesadas} distribución${data.distribucionesProcesadas !== 1 ? "es" : ""} vigente${data.distribucionesProcesadas !== 1 ? "s" : ""}.`
          : "Período activado. No había distribuciones vigentes con módulos asignados para generar clases todavía."
      )
      if (data.distribucionesSinModulos?.length > 0) {
        const nombres = data.distribucionesSinModulos
          .map((d: { identificadorEstructural: string; version: number }) => `${d.identificadorEstructural} (v${d.version})`)
          .join(", ")
        setAvisoActivacion(prev =>
          `${prev} ${data.distribucionesSinModulos.length} distribución${data.distribucionesSinModulos.length !== 1 ? "es" : ""} sin módulos asignados, sin generar: ${nombres}.`
        )
      }
      await cargarPeriodos()
    } catch {
      setError("Error de red")
    }
  }
  // ── Cerrar (ACTIVO -> CERRADO) ────────────────────────────────
  // Congela el período: las clases PROGRAMADA residuales se resuelven
  // (DICTADA si fecha ya pasó, SUSPENDIDA/PERIODO_OPERATIVO si es
  // un cierre anticipado y la fecha es futura). No se puede deshacer.
  // El backend devuelve los contadores reales del impacto — se muestran
  // acá en vez de descartarse (UX-PER-003).
  async function cerrar(id: number) {
    try {
      const res = await fetch(`/api/periodos-operativos/${id}/cerrar`, {
        method: "POST",
        headers: authHeaders,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error cerrando período")
        return
      }
      const dictadas    = data.clasesMarcadasDictadas ?? 0
      const suspendidas = data.clasesSuspendidasPorPeriodo ?? 0
      if (dictadas === 0 && suspendidas === 0) {
        setAvisoCierre("Período cerrado. No había clases pendientes en este período.")
      } else {
        const partes: string[] = []
        if (dictadas > 0) partes.push(`${dictadas} clase${dictadas !== 1 ? "s" : ""} marcada${dictadas !== 1 ? "s" : ""} como dictada${dictadas !== 1 ? "s" : ""}`)
        if (suspendidas > 0) partes.push(`${suspendidas} clase${suspendidas !== 1 ? "s" : ""} suspendida${suspendidas !== 1 ? "s" : ""} por cierre de período`)
        setAvisoCierre(`Período cerrado. ${partes.join(", ")}.`)
      }
      await cargarPeriodos()
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarCierreId(null)
    }
  }
  // ── Restaurar (reactivar período eliminado) ────────────────
  // Un período restaurado vuelve en el estado que tenía (no cambia
  // a ACTIVO automáticamente).
  async function restaurar(id: number) {
    try {
      const res = await fetch(`/api/periodos-operativos/${id}/restaurar`, {
        method: "POST",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error restaurando período")
        return
      }
      await cargarPeriodos()
    } catch {
      setError("Error de red")
    }
  }
  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
        Cargando períodos...
      </div>
    )
  }
  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este período? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}
      {confirmarCierreId !== null && (
        <ModalConfirmar
          mensaje={
            cierreAnticipado
              ? "¿Cerrar este período antes de su fecha de fin? Las clases con fecha ya pasada se van a marcar como dictadas; las clases futuras dentro de este período (hasta su fecha de fin) van a quedar suspendidas, no dictadas. No se van a poder hacer más cambios en el período. Esta acción no se puede deshacer."
              : "¿Cerrar este período? Las clases pendientes se marcarán como dictadas y no se van a poder hacer más cambios en el período. Esta acción no se puede deshacer."
          }
          textoConfirmar="Cerrar período"
          onConfirmar={() => cerrar(confirmarCierreId)}
          onCancelar={() => setConfirmarCierreId(null)}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Períodos Operativos
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {periodosFiltrados.length} período{periodosFiltrados.length !== 1 ? "s" : ""}
              {!verEliminados && " activos"}
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nuevo período
            </button>
          )}
        </div>
        {/* Aviso proactivo: sin período activo, o por vencer (UX-PER-001) */}
        <AvisoPeriodoOperativo linkDestino={null} />
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
        {/* Aviso de activación (informa cuántas clases se generaron) */}
        {avisoActivacion && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-success, green)", fontSize: "var(--text-xs)", color: "var(--color-success, green)" }}
            role="status"
          >
            {avisoActivacion}
            <button
              onClick={() => setAvisoActivacion(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-success, green)", fontSize: "var(--text-base)", lineHeight: 1 }}
              aria-label="Cerrar"
            >×</button>
          </div>
        )}
        {/* Aviso de cierre (informa el impacto real: dictadas vs suspendidas) — UX-PER-003 */}
        {avisoCierre && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-success, green)", fontSize: "var(--text-xs)", color: "var(--color-success, green)" }}
            role="status"
          >
            {avisoCierre}
            <button
              onClick={() => setAvisoCierre(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-success, green)", fontSize: "var(--text-base)", lineHeight: 1 }}
              aria-label="Cerrar"
            >×</button>
          </div>
        )}
        {/* Formulario inline */}
        {mostrarForm && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 520 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editando ? "Editar período" : "Nuevo período"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-4)" }}>
              {CAMPOS.map(({ key, label, required }) => (
                <div key={key}>
                  <label htmlFor={`field-${key}`} style={s.label}>
                    {label}
                    {required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
                  </label>
                  <input
                    id={`field-${key}`}
                    type={key === "fecha_desde" || key === "fecha_hasta" ? "date" : "text"}
                    value={form[key]}
                    onChange={e => {
                      setForm(prev => ({ ...prev, [key]: e.target.value }))
                      if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }))
                    }}
                    style={{ ...s.input, ...(formErrors[key] ? s.inputError : {}) }}
                    onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                    onBlur={e => { e.target.style.borderColor = formErrors[key] ? "var(--color-error)" : "var(--color-border)"; e.target.style.boxShadow = "none" }}
                    aria-invalid={!!formErrors[key]}
                  />
                  {formErrors[key] && (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>
                      {formErrors[key]}
                    </span>
                  )}
                </div>
              ))}
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
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear período"}
              </button>
            </div>
          </div>
        )}
        {/* Buscador + toggle */}
        {!mostrarForm && (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <input
              placeholder="Buscar por nombre..."
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
                {["Nombre", "Vigencia", "Estado", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    No hay períodos{verEliminados ? " eliminados" : " activos"} registrados
                  </td>
                </tr>
              ) : periodosFiltrados.map(p => {
                const eliminado = !!p.deletedAt
                return (
                  <tr
                    key={p.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Nombre */}
                    <td style={s.td}>
                      {p.nombre}
                      {eliminado && (
                        <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                          Eliminado
                        </span>
                      )}
                    </td>
                    {/* Vigencia (rango de fechas) */}
                    <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                      {new Date(p.fecha_desde).toLocaleDateString("es-AR", { timeZone: "UTC" })}
                      {" → "}
                      {new Date(p.fecha_hasta).toLocaleDateString("es-AR", { timeZone: "UTC" })}
                    </td>
                    {/* Estado */}
                    <td style={s.td}>
                      {eliminado ? (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                          ○ Eliminado
                        </span>
                      ) : p.estado === "ACTIVO" ? (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success, green)" }}>
                          ● Activo
                        </span>
                      ) : p.estado === "CERRADO" ? (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                          ■ Cerrado
                        </span>
                      ) : (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                          ○ Borrador
                        </span>
                      )}
                    </td>
                    {/* Acciones */}
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        {eliminado ? (
                          <button
                            onClick={() => restaurar(p.id)}
                            style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                          >
                            Restaurar
                          </button>
                        ) : p.estado === "CERRADO" ? (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                            Sin acciones disponibles
                          </span>
                        ) : p.estado === "ACTIVO" ? (
                          <button
                            onClick={() => setConfirmarCierreId(p.id)}
                            style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", cursor: "pointer", padding: 0 }}
                          >
                            Cerrar período
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => abrirEditar(p)}
                              style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => activar(p.id)}
                              style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-success, green)", cursor: "pointer", padding: 0 }}
                            >
                              Activar
                            </button>
                            <button
                              onClick={() => setConfirmarId(p.id)}
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