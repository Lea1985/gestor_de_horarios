// features/incidencias/components/ModalAusenciaSuplente.tsx
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  fetchCodigarios,
  fetchItemsCodigario,
  crearIncidencia,
  reasignarReemplazoService,
} from "../services/incidenciasService"
import type { Codigario, CodigarioItem, AgenteParaReemplazo, ClaseAfectada } from "../types"

const inputStyle = {
  width:        "100%",
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding:      "8px 12px",
  fontSize:     "var(--text-sm)",
  color:        "var(--color-text-primary)",
  outline:      "none",
}
const labelStyle = {
  fontSize:     "var(--text-xs)",
  fontWeight:   "var(--font-medium)" as const,
  color:        "var(--color-text-primary)",
  display:      "block" as const,
  marginBottom: "var(--space-1)",
}

// UX-INC-003: cuando la reasignación de alguna clase al nuevo suplente
// falla, no navegamos en silencio (antes: Promise.allSettled sin
// inspeccionar resultados). La incidencia SÍ se creó -- eso no se
// deshace -- pero avisamos cuántas clases quedaron sin reasignar y
// dejamos que el usuario decida cuándo continuar hacia el detalle.
type ResultadoParcial = {
  nuevaIncidenciaId: number
  fallidas:          number
  total:             number
}

// UX-102: la incidencia puede tener más de un suplente cubriendo tramos
// distintos (mismo titular, mismo período). En vez de pedirle al usuario
// que elija cuál se ausentó, se deduce a partir de las fechas que carga:
// se buscan las clases del padre que caen en ese rango y se mira qué
// agenteSuplente cubre esas clases. Si el rango no cae en ningún tramo
// con reemplazo activo, o cae en más de uno distinto, se bloquea el guardado.
type SuplenteResuelto =
  | { estado: "incompleto" }
  | { estado: "sin-cobertura" }
  | { estado: "ambiguo" }
  | { estado: "resuelto"; agente: { id: number; nombre: string; apellido: string } }

export function ModalAusenciaSuplente({
  incidenciaPadreId,
  asignacionId,
  asignacionTitularId,
  fechaMinima,
  fechaMaxima,
  clases,
  agentes,
  onCreada,
  onCancelar,
}: {
  incidenciaPadreId:   number
  asignacionId:        number
  asignacionTitularId: number
  fechaMinima:         string
  fechaMaxima:         string
  clases:              ClaseAfectada[]
  agentes:             AgenteParaReemplazo[]
  onCreada:            (nuevaIncidenciaId: number) => void
  onCancelar:          () => void
}) {
  const { authHeaders } = useAuth()
  const [codigarios,   setCodigarios]   = useState<Codigario[]>([])
  const [items,        setItems]        = useState<CodigarioItem[]>([])
  const [codigarioId,  setCodigarioId]  = useState("")
  const [itemId,       setItemId]       = useState("")
  const [fechaDesde,   setFechaDesde]   = useState("")
  const [fechaHasta,   setFechaHasta]   = useState("")
  const [observacion,  setObservacion]  = useState("")
  const [suplenteId,   setSuplenteId]   = useState("")
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [resultadoParcial, setResultadoParcial] = useState<ResultadoParcial | null>(null)

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    fetchCodigarios(authHeaders)
      .then(setCodigarios)
      .catch(() => setError("Error cargando codigarios"))
  }, [authHeaders.Authorization])

  useEffect(() => {
    if (!codigarioId) { setItems([]); setItemId(""); return }
    if (authHeaders.Authorization === "Bearer ") return
    setLoadingItems(true)
    fetchItemsCodigario(codigarioId, authHeaders)
      .then(i => { setItems(i); setItemId("") })
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [codigarioId, authHeaders.Authorization])

  const suplenteResuelto: SuplenteResuelto = useMemo(() => {
    if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) return { estado: "incompleto" }
    const enRango = clases.filter(c => {
      const f = c.fecha.slice(0, 10)
      return f >= fechaDesde && f <= fechaHasta
    })
    const distintos = new Map<number, { id: number; nombre: string; apellido: string }>()
    for (const c of enRango) {
      for (const r of c.reemplazos) {
        if (r.activo && r.agenteSuplente) {
          distintos.set(r.agenteSuplente.id, r.agenteSuplente)
        }
      }
    }
    if (distintos.size === 0) return { estado: "sin-cobertura" }
    if (distintos.size > 1)   return { estado: "ambiguo" }
    return { estado: "resuelto", agente: [...distintos.values()][0] }
  }, [fechaDesde, fechaHasta, clases])

  async function confirmar() {
    if (!itemId || !fechaDesde || !fechaHasta) {
      setError("Código, fecha desde y fecha hasta son obligatorios")
      return
    }
    if (fechaDesde < fechaMinima.slice(0, 10)) {
      setError(`La fecha desde no puede ser anterior al ${fechaMinima.slice(0, 10).split("-").reverse().join("/")}`)
      return
    }
    if (fechaHasta > fechaMaxima.slice(0, 10)) {
      setError(`La fecha hasta no puede superar el ${fechaMaxima.slice(0, 10).split("-").reverse().join("/")}`)
      return
    }
    if (suplenteResuelto.estado === "sin-cobertura") {
      setError("No hay suplente cubriendo esas fechas")
      return
    }
    if (suplenteResuelto.estado === "ambiguo") {
      setError("El rango incluye más de un suplente distinto — ajustá las fechas para que corresponda a uno solo")
      return
    }
    if (suplenteResuelto.estado !== "resuelto") {
      setError("No se pudo determinar el suplente para estas fechas")
      return
    }
    setGuardando(true)
    setError(null)
    try {
      // 1. Crear incidencia del suplente
      const nueva = await crearIncidencia({
        asignacionId,
        codigarioItemId:  Number(itemId),
        fecha_desde:      fechaDesde,
        fecha_hasta:      fechaHasta,
        observacion:      observacion || undefined,
        incidenciaPadreId,
      }, authHeaders)
      // 2. Si hay suplente, cargar clases y reasignarlas a la nueva
      //    incidencia de forma atómica (desactiva el reemplazo viejo,
      //    mueve clase.incidenciaId, crea el reemplazo nuevo — todo
      //    en una sola transacción del backend).
      if (suplenteId) {
        const res = await fetch(`/api/incidencias/${nueva.id}/clases`, {
          headers: authHeaders,
        })
        if (res.ok) {
          const clasesNuevaIncidencia = await res.json()
          // Incluye clases sin cubrir (PROGRAMADA) y clases que ya tenían
          // un reemplazo activo (REEMPLAZADA), para poder reasignarlas.
          const elegibles = clasesNuevaIncidencia.filter((c: { estado: string }) =>
            c.estado === "PROGRAMADA" || c.estado === "REEMPLAZADA"
          )
          const resultados = await Promise.allSettled(
            elegibles.map((clase: { id: number }) =>
              reasignarReemplazoService({
                claseId:             clase.id,
                nuevaIncidenciaId:   nueva.id,
                asignacionTitularId,
                agenteSuplenteId:    Number(suplenteId),
              }, authHeaders)
            )
          )
          const fallidas = resultados.filter(r => r.status === "rejected").length
          if (fallidas > 0) {
            // La incidencia ya existe (no se deshace) pero no todas
            // las clases se reasignaron. No navegamos solos: mostramos
            // el resumen y dejamos que el usuario continúe cuando
            // quiera, en vez de ocultar el problema.
            setGuardando(false)
            setResultadoParcial({ nuevaIncidenciaId: nueva.id, fallidas, total: elegibles.length })
            return
          }
        }
      }
      onCreada(nueva.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error registrando ausencia")
      setGuardando(false)
    }
  }

  const encabezadoColor = suplenteResuelto.estado === "ambiguo" || suplenteResuelto.estado === "sin-cobertura"
    ? "var(--color-error)"
    : "var(--color-text-secondary)"

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={resultadoParcial ? undefined : onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        {resultadoParcial ? (
          <>
            <div>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                Incidencia creada con avisos
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-warning-bg, #fefce8)", border: "1px solid var(--color-warning, #ca8a04)", fontSize: "var(--text-sm)", color: "var(--color-warning-text, #854d0e)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              La incidencia se creó correctamente, pero {resultadoParcial.fallidas} de {resultadoParcial.total} clase{resultadoParcial.total !== 1 ? "s" : ""} no se pudo{resultadoParcial.fallidas !== 1 ? "n" : ""} reasignar al nuevo suplente. Vas a poder asignarlas manualmente desde el detalle de la incidencia nueva.
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button
                onClick={() => onCreada(resultadoParcial.nuevaIncidenciaId)}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: "pointer" }}
              >
                Ir a la incidencia creada
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
                Registrar ausencia del suplente
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: encabezadoColor }}>
                {suplenteResuelto.estado === "resuelto" &&
                  `${suplenteResuelto.agente.apellido}, ${suplenteResuelto.agente.nombre} · hasta ${fechaMaxima.slice(0, 10).split("-").reverse().join("/")}`}
                {suplenteResuelto.estado === "incompleto" &&
                  `Completá las fechas para ver qué suplente se ausenta (hasta ${fechaMaxima.slice(0, 10).split("-").reverse().join("/")})`}
                {suplenteResuelto.estado === "sin-cobertura" &&
                  "No hay suplente cubriendo esas fechas"}
                {suplenteResuelto.estado === "ambiguo" &&
                  "El rango incluye más de un suplente distinto — ajustá las fechas"}
              </p>
            </div>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}
            {/* Codigario */}
            <div>
              <label style={labelStyle}>
                Codigario <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                value={codigarioId}
                onChange={e => setCodigarioId(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
              >
                <option value="">Seleccionar codigario...</option>
                {codigarios.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            {/* Item */}
            <div>
              <label style={labelStyle}>
                Código <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                disabled={!codigarioId || loadingItems}
                style={{ ...inputStyle, opacity: !codigarioId ? 0.5 : 1 }}
                onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
              >
                <option value="">Seleccionar código...</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>
                ))}
              </select>
            </div>
            {/* Fechas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={labelStyle}>
                  Desde <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  min={fechaMinima.slice(0, 10)}
                  max={fechaMaxima.slice(0, 10)}
                  onChange={e => setFechaDesde(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Hasta <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaMinima.slice(0, 10)}
                  max={fechaMaxima.slice(0, 10)}
                  onChange={e => setFechaHasta(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                  onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
                />
              </div>
            </div>
            {/* Suplente — opcional */}
            <div>
              <label style={labelStyle}>
                Nuevo suplente{" "}
                <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <select
                value={suplenteId}
                onChange={e => setSuplenteId(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
              >
                <option value="">Sin reemplazo por ahora...</option>
                {agentes
                  // UX-REE-001: excluir al suplente que ya se identificó como
                  // el que se está reemplazando -- elegirlo de nuevo acá
                  // dispararía AutoReemplazoError en el backend. El backend
                  // sigue siendo la guarda real, esto solo evita ofrecer una
                  // opción que de todas formas va a fallar.
                  .filter(a => !(suplenteResuelto.estado === "resuelto" && a.id === suplenteResuelto.agente.id))
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.apellido}, {a.nombre} — {a.documento}
                    </option>
                  ))}
              </select>
            </div>
            {/* Observación */}
            <div>
              <label style={labelStyle}>
                Observación{" "}
                <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(30,155,184,0.12)" }}
                onBlur={e  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button
                onClick={onCancelar}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={guardando || suplenteResuelto.estado !== "resuelto"}
                style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: (guardando || suplenteResuelto.estado !== "resuelto") ? "not-allowed" : "pointer", opacity: (guardando || suplenteResuelto.estado !== "resuelto") ? 0.6 : 1 }}
              >
                {guardando ? "Guardando..." : "Registrar ausencia"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}