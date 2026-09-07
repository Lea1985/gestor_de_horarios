"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
type Item = {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  porcentajeComputable: number
  activo: boolean
  deletedAt: string | null
}
type Codigario = {
  id: number
  nombre: string
  descripcion: string | null
  items: Item[]
}
type FormData = {
  codigo: string
  nombre: string
  descripcion: string
  porcentajeComputable: string
}
const FORM_VACIO: FormData = { codigo: "", nombre: "", descripcion: "", porcentajeComputable: "100" }
const s = {
  label: {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--font-medium)" as const,
    color: "var(--color-text-primary)",
    display: "block" as const,
    marginBottom: "var(--space-1)",
  },
  input: {
    width: "100%",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "8px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    outline: "none",
  },
  inputError: {
    borderColor: "var(--color-error)",
  },
  th: {
    textAlign: "left" as const,
    fontSize: "var(--text-2xs)",
    fontWeight: "var(--font-medium)" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--color-text-secondary)",
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border-strong)",
    background: "var(--color-surface-raised)",
  },
  td: {
    padding: "10px 12px",
    fontSize: "var(--text-sm)",
    color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle" as const,
  },
}
function ModalConfirmar({
  mensaje,
  textoConfirmar = "Eliminar",
  onConfirmar,
  onCancelar,
}: {
  mensaje: string
  textoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "var(--z-modal)",
      }}
      onClick={onCancelar}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          maxWidth: 360,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
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
export default function CodigarioDetallePage() {
  const params = useParams()
  const codigarioId = params.id as string
  const { authHeaders } = useAuth()
  const [codigario,    setCodigario]    = useState<Codigario | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [mostrarForm,  setMostrarForm]  = useState(false)
  const [guardando,    setGuardando]    = useState(false)
  const [form,         setForm]         = useState<FormData>(FORM_VACIO)
  const [formErrors,   setFormErrors]   = useState<Partial<FormData>>({})
  const [error,        setError]        = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [confirmarId,  setConfirmarId]  = useState<number | null>(null)
  const [reactivacionPendiente, setReactivacionPendiente] = useState<{
    nombre: string; descripcion: string | null; porcentajeComputable: number; fechaEliminacion: string
  } | null>(null)
  const [editandoId,   setEditandoId]   = useState<number | null>(null)
  const [busqueda,     setBusqueda]     = useState("")
  const [verInactivos, setVerInactivos] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
const itemsFiltrados = useMemo(() => {
  const items = codigario?.items ?? []
  if (!busqueda.trim()) return items
  const q = busqueda.toLowerCase()
  return items.filter(i =>
    i.codigo.toLowerCase().includes(q) ||
    i.nombre.toLowerCase().includes(q) ||
    (i.descripcion?.toLowerCase().includes(q) ?? false)
  )
}, [codigario, busqueda])
async function cargar() {
  try {
    setLoading(true)
    const res = await fetch(`/api/codigarios/${codigarioId}?inactivos=${String(verInactivos)}`, {
      headers: authHeaders,
    })
    if (!res.ok) throw new Error()
    setCodigario(await res.json())
  } catch {
    setError("Error cargando codigario")
  } finally {
    setLoading(false)
  }
}
useEffect(() => {
  if (authHeaders.Authorization !== "Bearer ") cargar()
}, [authHeaders.Authorization, verInactivos])
useEffect(() => {
  if (mostrarForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
}, [mostrarForm])
  function mostrarExito(msg: string) {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(null), 3000)
  }
  function abrirCrear() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setMostrarForm(true)
    setError(null)
    setMensajeExito(null)
  }
  function abrirEditar(item: Item) {
    setEditandoId(item.id)
    setForm({ codigo: item.codigo, nombre: item.nombre, descripcion: item.descripcion ?? "", porcentajeComputable: String(item.porcentajeComputable) })
    setFormErrors({})
    setMostrarForm(true)
    setError(null)
    setMensajeExito(null)
  }
  function cancelar() {
    setMostrarForm(false)
    setEditandoId(null)
    setForm(FORM_VACIO)
    setFormErrors({})
    setError(null)
  }
  function validar() {
    const errors: Partial<FormData> = {}
    if (!form.codigo.trim()) errors.codigo = "Campo requerido"
    if (!form.nombre.trim()) errors.nombre = "Campo requerido"
    const pc = Number(form.porcentajeComputable)
    if (form.porcentajeComputable.trim() === "" || !Number.isInteger(pc) || pc < 0 || pc > 100) {
      errors.porcentajeComputable = "Entero entre 0 y 100"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  async function guardar(confirmarReactivacion = false) {
    if (!validar()) return
    setGuardando(true)
    setError(null)
    try {
      const url = editandoId === null
        ? `/api/codigarios/${codigarioId}/items`
        : `/api/codigarios/${codigarioId}/items/${editandoId}`
      const method = editandoId === null ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          porcentajeComputable: Number(form.porcentajeComputable),
          ...(confirmarReactivacion ? { confirmarReactivacion: true } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (data.code === "REACTIVACION_REQUERIDA") {
          setReactivacionPendiente(data.itemExistente)
          return
        }
        setError(data.error ?? "Error guardando item")
        return
      }
      setReactivacionPendiente(null)
      await cargar()
      mostrarExito(
        confirmarReactivacion ? "Item reactivado" : editandoId === null ? "Item creado" : "Item actualizado"
      )
      cancelar()
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }
  function confirmarReactivacionItem() {
    guardar(true)
  }
  async function eliminarItem(itemId: number) {
    try {
      const res = await fetch(`/api/codigarios/${codigarioId}/items/${itemId}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error eliminando item")
        return
      }
      await cargar()
      mostrarExito("Item eliminado")
    } catch {
      setError("Error de red")
    } finally {
      setConfirmarId(null)
    }
  }
  async function reactivarItem(itemId: number) {
    try {
      const res = await fetch(`/api/codigarios/${codigarioId}/items/${itemId}/reactivar`, {
        method: "POST",
        headers: authHeaders,
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error reactivando item")
        return
      }
      setCodigario(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, activo: true, deletedAt: null } : i),
      } : prev)
      mostrarExito("Item reactivado")
    } catch {
      setError("Error de red")
    }
  }
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando...
    </div>
  )
  if (!codigario) return <div>No encontrado</div>
  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar este item? Esta acción no se puede deshacer."
          onConfirmar={() => eliminarItem(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}
      {reactivacionPendiente && (
        <ModalConfirmar
          mensaje={`Ya existió un item con el código "${form.codigo}" (${reactivacionPendiente.nombre}), eliminado el ${reactivacionPendiente.fechaEliminacion}. Si continuás, se reactiva ese item con los datos que acabás de cargar — incluyendo las incidencias históricas ya asociadas a él. ¿Reactivarlo?`}
          textoConfirmar="Reactivar con estos datos"
          onConfirmar={confirmarReactivacionItem}
          onCancelar={() => setReactivacionPendiente(null)}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Link href="/protected/dashboard/codigarios" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              ← Volver
            </Link>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginTop: "var(--space-1)" }}>
              {codigario.nombre}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {codigario.descripcion ?? "Sin descripción"} · {itemsFiltrados.length} item{itemsFiltrados.length !== 1 ? "s" : ""}
              {!verInactivos && " activo" + (itemsFiltrados.length !== 1 ? "s" : "")}
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={abrirCrear}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nuevo item
            </button>
          )}
        </div>
        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }} aria-label="Cerrar">×</button>
          </div>
        )}
        {/* Éxito */}
        {mensajeExito && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "#f0fdf4", border: "1px solid #16a34a", fontSize: "var(--text-xs)", color: "#16a34a" }} role="status">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {mensajeExito}
            <button onClick={() => setMensajeExito(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#16a34a", fontSize: "var(--text-base)", lineHeight: 1 }} aria-label="Cerrar">×</button>
          </div>
        )}
        {/* Formulario */}
        {mostrarForm && (
          <div ref={formRef} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 520 }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              {editandoId === null ? "Nuevo item" : "Editar item"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              {[
                { key: "codigo" as const, label: "Código", required: true, type: "text" },
                { key: "nombre" as const, label: "Nombre", required: true, type: "text" },
                { key: "descripcion" as const, label: "Descripción", type: "text" },
                { key: "porcentajeComputable" as const, label: "% Computable", required: true, type: "number" },
              ].map(({ key, label, required, type }) => (
                <div key={key} style={{ gridColumn: key === "descripcion" ? "1 / -1" : undefined }}>
                  <label style={s.label}>
                    {label}
                    {required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
                  </label>
                  <input
                    type={type}
                    {...(type === "number" ? { min: 0, max: 100, step: 1 } : {})}
                    value={form[key]}
                    onChange={e => {
                      setForm(prev => ({ ...prev, [key]: e.target.value }))
                      if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }))
                    }}
                    style={{ ...s.input, ...(formErrors[key] ? s.inputError : {}) }}
                    onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                    onBlur={e => { e.target.style.borderColor = formErrors[key] ? "var(--color-error)" : "var(--color-border)"; e.target.style.boxShadow = "none" }}
                  />
                  {formErrors[key] && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{formErrors[key]}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
              <button onClick={cancelar} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => guardar()} disabled={guardando} style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}>
                {guardando ? "Guardando..." : editandoId === null ? "Crear item" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
        {/* Buscador + toggle */}
        {!mostrarForm && (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <input
              placeholder="Buscar por código, nombre o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ ...s.input, flex: 1 }}
              onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
              onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              <input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} style={{ cursor: "pointer" }} />
              Ver inactivos
            </label>
          </div>
        )}
        {/* Tabla */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Código", "Nombre", "Descripción", "% Computable", ""].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                    No hay items{!verInactivos ? " activos" : ""} registrados
                  </td>
                </tr>
              ) : itemsFiltrados.map(item => (
                <tr
                  key={item.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {item.codigo}
                    {!item.activo && (
                      <span style={{ marginLeft: 6, fontSize: "var(--text-2xs)", padding: "2px 6px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td style={s.td}>{item.nombre}</td>
                  <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>{item.descripcion ?? "—"}</td>
                  <td style={s.td}>{item.porcentajeComputable}%</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                      {item.activo ? (
                        <>
                          <button onClick={() => abrirEditar(item)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}>
                            Editar
                          </button>
                          <button onClick={() => setConfirmarId(item.id)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}>
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <button onClick={() => reactivarItem(item.id)} style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}