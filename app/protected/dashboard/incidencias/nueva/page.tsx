// app/protected/dashboard/incidencias/nueva/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"

// ── Tipos ─────────────────────────────────────────────────────

type Asignacion = {
  id:                       number
  identificadorEstructural: string
  agente:   { nombre: string; apellido: string; documento: string }
  unidad:   { nombre: string }
  curso:    { id: number; nombre: string } | null
  comision: { id: number; nombre: string } | null
  turno:    { id: number; nombre: string } | null
}

type Codigario     = { id: number; nombre: string }
type CodigarioItem = { id: number; codigo: string; nombre: string }

type DatosComunes = {
  codigarioId:     string
  codigarioItemId: string
  fecha_desde:     string
  fecha_hasta:     string
  observacion:     string
}

type ResultadoCarga = {
  asignacionId: number
  identificador: string
  agente: string
  ok: boolean
  error?: string
}

const DATOS_VACIO: DatosComunes = {
  codigarioId: "", codigarioItemId: "", fecha_desde: "", fecha_hasta: "", observacion: "",
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

// ── Indicador de pasos ────────────────────────────────────────

function Stepper({ paso }: { paso: 1 | 2 | 3 }) {
  const pasos = ["Seleccionar asignaciones", "Revisar lote", "Datos de la incidencia"]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
      {pasos.map((label, i) => {
        const n       = i + 1
        const activo  = n === paso
        const hecho   = n < paso
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
              background: hecho ? "var(--color-success-bg)" : activo ? "var(--color-primary)" : "var(--color-surface-raised)",
              color:      hecho ? "var(--color-success-text)" : activo ? "white" : "var(--color-text-hint)",
              border:     activo ? "none" : "1px solid var(--color-border)",
              flexShrink: 0,
            }}>
              {hecho ? "✓" : n}
            </div>
            <span style={{
              fontSize: "var(--text-xs)", fontWeight: activo ? "var(--font-medium)" as const : 400,
              color: activo ? "var(--color-text-primary)" : "var(--color-text-hint)",
              whiteSpace: "nowrap" as const,
            }}>
              {label}
            </span>
            {i < pasos.length - 1 && (
              <div style={{ width: 24, height: 1, background: "var(--color-border)", flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function NuevaIncidenciaPage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  // Datos base
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [codigarios,   setCodigarios]   = useState<Codigario[]>([])
  const [items,        setItems]        = useState<CodigarioItem[]>([])
  const [loadingBase,  setLoadingBase]  = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)

  // Paso actual
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Paso 1 — filtros y selección
  const [filtroTexto,   setFiltroTexto]   = useState("")
  const [filtroCurso,   setFiltroCurso]   = useState("")
  const [seleccionados, setSeleccionados] = useState<number[]>([])

  // Paso 3 — datos comunes
  const [datos,      setDatos]      = useState<DatosComunes>(DATOS_VACIO)
  const [datosErr,   setDatosErr]   = useState<Partial<DatosComunes>>({})
  const [guardando,  setGuardando]  = useState(false)
  const [resultado,  setResultado]  = useState<ResultadoCarga[] | null>(null)

  // Error global
  const [error, setError] = useState<string | null>(null)

  // ── Carga inicial ────────────────────────────────────────────

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    async function cargar() {
      try {
        const [rA, rC] = await Promise.all([
          fetch("/api/asignaciones", { headers: authHeaders }),
          fetch("/api/codigarios",   { headers: authHeaders }),
        ])
        setAsignaciones(rA.ok ? await rA.json() : [])
        setCodigarios(rC.ok   ? await rC.json() : [])
      } catch {
        setError("Error cargando datos")
      } finally {
        setLoadingBase(false)
      }
    }
    cargar()
  }, [authHeaders.Authorization])

  // ── Cargar items cuando cambia codigario ─────────────────────

  useEffect(() => {
    if (!datos.codigarioId) { setItems([]); setDatos(p => ({ ...p, codigarioItemId: "" })); return }
    setLoadingItems(true)
    fetch(`/api/codigarios/${datos.codigarioId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setDatos(p => ({ ...p, codigarioItemId: "" })) })
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [datos.codigarioId])

  // ── Cursos únicos para filtro ────────────────────────────────

  const cursosUnicos = useMemo(() => {
    const vistos = new Map<number, string>()
    asignaciones.forEach(a => { if (a.curso) vistos.set(a.curso.id, a.curso.nombre) })
    return Array.from(vistos.entries()).map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [asignaciones])

  // ── Asignaciones filtradas ───────────────────────────────────

  const asignacionesFiltradas = useMemo(() => {
    const q = filtroTexto.toLowerCase().trim()
    return asignaciones.filter(a => {
      const matchTexto = !q || (
        a.identificadorEstructural.toLowerCase().includes(q) ||
        a.agente.apellido.toLowerCase().includes(q)          ||
        a.agente.nombre.toLowerCase().includes(q)            ||
        a.agente.documento.toLowerCase().includes(q)
      )
      const matchCurso = !filtroCurso || a.curso?.id === Number(filtroCurso)
      return matchTexto && matchCurso
    })
  }, [asignaciones, filtroTexto, filtroCurso])

  // Asignaciones del lote (para paso 2 y 3)
  const asignacionesLote = useMemo(
    () => asignaciones.filter(a => seleccionados.includes(a.id)),
    [asignaciones, seleccionados]
  )

  // ── Helpers selección ────────────────────────────────────────

  function toggleSeleccion(id: number) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleTodos() {
    const idsFiltrados = asignacionesFiltradas.map(a => a.id)
    const todosSeleccionados = idsFiltrados.every(id => seleccionados.includes(id))
    if (todosSeleccionados) {
      setSeleccionados(prev => prev.filter(id => !idsFiltrados.includes(id)))
    } else {
      setSeleccionados(prev => [...new Set([...prev, ...idsFiltrados])])
    }
  }

  function quitarDelLote(id: number) {
    setSeleccionados(prev => prev.filter(x => x !== id))
  }

  // ── Validar datos comunes ────────────────────────────────────

  function validarDatos(): boolean {
    const err: Partial<DatosComunes> = {}
    if (!datos.codigarioId)     err.codigarioId     = "Requerido"
    if (!datos.codigarioItemId) err.codigarioItemId = "Requerido"
    if (!datos.fecha_desde)     err.fecha_desde     = "Requerido"
    if (!datos.fecha_hasta)     err.fecha_hasta     = "Requerido"
    setDatosErr(err)
    return Object.keys(err).length === 0
  }

  // ── Guardar lote ─────────────────────────────────────────────

  async function guardarLote() {
    if (!validarDatos()) return
    setGuardando(true)
    setError(null)

    const resultados: ResultadoCarga[] = []

    for (const a of asignacionesLote) {
      try {
        const res = await fetch("/api/incidencias", {
          method:  "POST",
          headers: authHeaders,
          body: JSON.stringify({
            asignacionId:    a.id,
            codigarioItemId: Number(datos.codigarioItemId),
            fecha_desde:     datos.fecha_desde,
            fecha_hasta:     datos.fecha_hasta,
            observacion:     datos.observacion || undefined,
          }),
        })
        const data = await res.json()
        resultados.push({
          asignacionId:  a.id,
          identificador: a.identificadorEstructural,
          agente:        `${a.agente.apellido}, ${a.agente.nombre}`,
          ok:            res.ok,
          error:         res.ok ? undefined : (data.error ?? "Error desconocido"),
        })
      } catch {
        resultados.push({
          asignacionId:  a.id,
          identificador: a.identificadorEstructural,
          agente:        `${a.agente.apellido}, ${a.agente.nombre}`,
          ok:            false,
          error:         "Error de red",
        })
      }
    }

    setResultado(resultados)
    setGuardando(false)
  }

  // ── Loading ──────────────────────────────────────────────────

  if (loadingBase) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando...
    </div>
  )

  // ── Resultado final ──────────────────────────────────────────

  if (resultado) {
    const exitosos = resultado.filter(r => r.ok).length
    const fallidos = resultado.filter(r => !r.ok).length
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 700 }}>
        <div>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
            Resultado de la carga
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
            {exitosos} creada{exitosos !== 1 ? "s" : ""} correctamente
            {fallidos > 0 && ` · ${fallidos} con error`}
          </p>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agente", "Identificador", "Estado"].map(col => <th key={col} style={s.th}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {resultado.map(r => (
                <tr key={r.asignacionId}>
                  <td style={s.td}>{r.agente}</td>
                  <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{r.identificador}</td>
                  <td style={s.td}>
                    {r.ok
                      ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-success-text)", background: "var(--color-success-bg)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>OK</span>
                      : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{r.error}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            onClick={() => router.push("/protected/dashboard/incidencias")}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}
          >
            Ir a incidencias
          </button>
          {fallidos > 0 && (
            <button
              onClick={() => { setResultado(null); setPaso(3) }}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Reintentar fallidas
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Render principal ─────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/protected/dashboard/incidencias")}
          style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
          Nueva incidencia
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
          Podés cargar la misma incidencia a múltiples asignaciones a la vez
        </p>
      </div>

      <Stepper paso={paso} />

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── PASO 1: Seleccionar asignaciones ── */}
      {paso === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Filtros */}
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" as const }}>
            <input
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              placeholder="Buscar por agente, identificador o documento..."
              style={{ ...s.input, flex: "1 1 260px", minWidth: 200 }}
              onFocus={focusStyle}
              onBlur={blurStyle(false)}
            />
            <select
              value={filtroCurso}
              onChange={e => setFiltroCurso(e.target.value)}
              style={{ ...s.input, flex: "0 1 200px" }}
              onFocus={focusStyle}
              onBlur={blurStyle(false)}
            >
              <option value="">Todos los cursos</option>
              {cursosUnicos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Contador seleccionados */}
          {seleccionados.length > 0 && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", fontWeight: "var(--font-medium)" }}>
              {seleccionados.length} asignación{seleccionados.length !== 1 ? "es" : ""} seleccionada{seleccionados.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Tabla */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 40 }}>
                    <input
                      type="checkbox"
                      checked={asignacionesFiltradas.length > 0 && asignacionesFiltradas.every(a => seleccionados.includes(a.id))}
                      onChange={toggleTodos}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  {["Agente", "Identificador", "Unidad", "Curso / Comisión"].map(col => (
                    <th key={col} style={s.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asignacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-12)", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
                      Sin resultados
                    </td>
                  </tr>
                ) : asignacionesFiltradas.map(a => {
                  const seleccionado = seleccionados.includes(a.id)
                  return (
                    <tr
                      key={a.id}
                      onClick={() => toggleSeleccion(a.id)}
                      style={{
                        cursor: "pointer",
                        transition: "background 0.1s",
                        background: seleccionado ? "var(--color-accent-bg, #f0f8ff)" : "transparent",
                      }}
                      onMouseEnter={e => { if (!seleccionado) e.currentTarget.style.background = "var(--color-surface-raised)" }}
                      onMouseLeave={e => { e.currentTarget.style.background = seleccionado ? "var(--color-accent-bg, #f0f8ff)" : "transparent" }}
                    >
                      <td style={{ ...s.td, width: 40 }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleSeleccion(a.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={s.td}>
                        {a.agente.apellido}, {a.agente.nombre}
                        <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                          {a.agente.documento}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                        {a.identificadorEstructural}
                      </td>
                      <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        {a.unidad.nombre}
                      </td>
                      <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                        {[a.curso?.nombre, a.comision?.nombre].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => { if (seleccionados.length > 0) setPaso(2) }}
              disabled={seleccionados.length === 0}
              style={{
                padding: "9px 20px", borderRadius: "var(--radius-lg)", border: "none",
                background: "var(--color-primary)", color: "white",
                fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
                cursor: seleccionados.length === 0 ? "not-allowed" : "pointer",
                opacity: seleccionados.length === 0 ? 0.4 : 1,
              }}
            >
              Continuar con {seleccionados.length || ""} seleccionada{seleccionados.length !== 1 ? "s" : ""} →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Revisar lote ── */}
      {paso === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Revisá el lote antes de continuar. Podés quitar asignaciones si es necesario.
          </p>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Agente", "Identificador", "Unidad", "Curso / Comisión", ""].map(col => (
                    <th key={col} style={s.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asignacionesLote.map(a => (
                  <tr key={a.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.td}>
                      {a.agente.apellido}, {a.agente.nombre}
                      <span style={{ display: "block", fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>{a.agente.documento}</span>
                    </td>
                    <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                      {a.identificadorEstructural}
                    </td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {a.unidad.nombre}
                    </td>
                    <td style={{ ...s.td, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                      {[a.curso?.nombre, a.comision?.nombre].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td style={s.td}>
                      <button
                        onClick={() => quitarDelLote(a.id)}
                        style={{ background: "none", border: "none", fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-error)", cursor: "pointer", padding: 0 }}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "space-between" }}>
            <button
              onClick={() => setPaso(1)}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              ← Agregar más
            </button>
            <button
              onClick={() => { if (asignacionesLote.length > 0) setPaso(3) }}
              disabled={asignacionesLote.length === 0}
              style={{
                padding: "9px 20px", borderRadius: "var(--radius-lg)", border: "none",
                background: "var(--color-primary)", color: "white",
                fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
                cursor: asignacionesLote.length === 0 ? "not-allowed" : "pointer",
                opacity: asignacionesLote.length === 0 ? 0.4 : 1,
              }}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Datos comunes ── */}
      {paso === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

          {/* Resumen del lote */}
          <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
            <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
              LOTE — {asignacionesLote.length} asignación{asignacionesLote.length !== 1 ? "es" : ""}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--space-2)" }}>
              {asignacionesLote.map(a => (
                <span key={a.id} style={{
                  fontSize: "var(--text-xs)", padding: "3px 8px",
                  borderRadius: "var(--radius-sm)", background: "var(--color-surface)",
                  border: "1px solid var(--color-border)", color: "var(--color-text-primary)",
                }}>
                  {a.agente.apellido}, {a.agente.nombre}
                </span>
              ))}
            </div>
          </div>

          {/* Formulario datos comunes */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
              Datos de la incidencia
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>

              {/* Codigario */}
              <div>
                <label style={s.label}>Tipo de incidencia <span style={{ color: "var(--color-error)" }}>*</span></label>
                <select
                  value={datos.codigarioId}
                  onChange={e => { setDatos(p => ({ ...p, codigarioId: e.target.value })); setDatosErr(p => ({ ...p, codigarioId: undefined })) }}
                  style={{ ...s.input, ...(datosErr.codigarioId ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={focusStyle} onBlur={blurStyle(!!datosErr.codigarioId)}
                >
                  <option value="">Seleccionar catálogo...</option>
                  {codigarios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {datosErr.codigarioId && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{datosErr.codigarioId}</span>}
              </div>

              {/* Item */}
              <div>
                <label style={s.label}>Código <span style={{ color: "var(--color-error)" }}>*</span></label>
                <select
                  value={datos.codigarioItemId}
                  onChange={e => { setDatos(p => ({ ...p, codigarioItemId: e.target.value })); setDatosErr(p => ({ ...p, codigarioItemId: undefined })) }}
                  disabled={!datos.codigarioId || loadingItems}
                  style={{
                    ...s.input,
                    ...(datosErr.codigarioItemId ? { borderColor: "var(--color-error)" } : {}),
                    opacity: (!datos.codigarioId || loadingItems) ? 0.5 : 1,
                  }}
                  onFocus={focusStyle} onBlur={blurStyle(!!datosErr.codigarioItemId)}
                >
                  <option value="">
                    {loadingItems ? "Cargando..." : !datos.codigarioId ? "Primero seleccioná un catálogo" : "Seleccionar código..."}
                  </option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>)}
                </select>
                {datosErr.codigarioItemId && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{datosErr.codigarioItemId}</span>}
              </div>

              {/* Fecha desde */}
              <div>
                <label style={s.label}>Fecha desde <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input
                  type="date" value={datos.fecha_desde}
                  onChange={e => { setDatos(p => ({ ...p, fecha_desde: e.target.value })); setDatosErr(p => ({ ...p, fecha_desde: undefined })) }}
                  style={{ ...s.input, ...(datosErr.fecha_desde ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={focusStyle} onBlur={blurStyle(!!datosErr.fecha_desde)}
                />
                {datosErr.fecha_desde && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{datosErr.fecha_desde}</span>}
              </div>

              {/* Fecha hasta */}
              <div>
                <label style={s.label}>Fecha hasta <span style={{ color: "var(--color-error)" }}>*</span></label>
                <input
                  type="date" value={datos.fecha_hasta}
                  onChange={e => { setDatos(p => ({ ...p, fecha_hasta: e.target.value })); setDatosErr(p => ({ ...p, fecha_hasta: undefined })) }}
                  style={{ ...s.input, ...(datosErr.fecha_hasta ? { borderColor: "var(--color-error)" } : {}) }}
                  onFocus={focusStyle} onBlur={blurStyle(!!datosErr.fecha_hasta)}
                />
                {datosErr.fecha_hasta && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)", display: "block" }}>{datosErr.fecha_hasta}</span>}
              </div>

              {/* Observación */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={s.label}>
                  Observación <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  value={datos.observacion}
                  onChange={e => setDatos(p => ({ ...p, observacion: e.target.value }))}
                  rows={3}
                  style={{ ...s.input, resize: "vertical" }}
                  onFocus={focusStyle} onBlur={blurStyle(false)}
                  placeholder="Ej: Certificado médico presentado"
                />
              </div>

            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", justifyContent: "space-between" }}>
              <button
                onClick={() => setPaso(2)}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                ← Revisar lote
              </button>
              <button
                onClick={guardarLote}
                disabled={guardando}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-lg)", border: "none",
                  background: "var(--color-primary)", color: "white",
                  fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
                  cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando
                  ? `Cargando ${asignacionesLote.length} incidencia${asignacionesLote.length !== 1 ? "s" : ""}...`
                  : `Crear ${asignacionesLote.length} incidencia${asignacionesLote.length !== 1 ? "s" : ""}`
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
