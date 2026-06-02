// features/incidencias/components/ModalAusenciaSuplente.tsx
import { useState, useEffect } from "react"
import { useAuth } from "@/app/hooks/useAuth"
import {
  fetchCodigarios,
  fetchItemsCodigario,
  crearIncidencia,
  crearReemplazoService,
} from "../services/incidenciasService"
import type { Codigario, CodigarioItem, AgenteParaReemplazo } from "../types"

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

export function ModalAusenciaSuplente({
  incidenciaPadreId,
  asignacionId,
  asignacionTitularId,
  fechaMaxima,
  nombreSuplente,
  agentes,
  onCreada,
  onCancelar,
}: {
  incidenciaPadreId:   number
  asignacionId:        number
  asignacionTitularId: number
  fechaMaxima:         string
  nombreSuplente:      string
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

  async function confirmar() {
    if (!itemId || !fechaDesde || !fechaHasta) {
      setError("Código, fecha desde y fecha hasta son obligatorios")
      return
    }
    if (fechaHasta > fechaMaxima.slice(0, 10)) {
      setError(`La fecha hasta no puede superar el ${fechaMaxima.slice(0, 10).split("-").reverse().join("/")}`)
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

      // 2. Si hay suplente, cargar clases y crear reemplazos
      if (suplenteId) {
        const res = await fetch(`/api/incidencias/${nueva.id}/clases`, {
          headers: authHeaders,
        })
        if (res.ok) {
          const clases = await res.json()
          const programadas = clases.filter((c: { estado: string }) => c.estado === "PROGRAMADA")
          await Promise.allSettled(
            programadas.map((clase: { id: number }) =>
              crearReemplazoService({
                claseId:             clase.id,
                asignacionTitularId,
                agenteSuplenteId:    Number(suplenteId),
              }, authHeaders)
            )
          )
        }
      }

      onCreada(nueva.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error registrando ausencia")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
            Registrar ausencia del suplente
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {nombreSuplente} · hasta {fechaMaxima.slice(0, 10).split("-").reverse().join("/")}
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
            {agentes.map(a => (
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
            disabled={guardando}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "white", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Registrar ausencia"}
          </button>
        </div>
      </div>
    </div>
  )
}