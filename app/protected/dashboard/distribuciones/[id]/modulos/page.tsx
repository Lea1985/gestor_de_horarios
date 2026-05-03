// app/protected/dashboard/distribuciones/[id]/modulos/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { minutosAHora } from "@/lib/helpers/tiempo"

type Modulo = {
  id:         number
  dia_semana: string
  hora_desde: number
  hora_hasta: number
}

type Distribucion = {
  id:      number
  version: number
  asignacion: {
    identificadorEstructural: string
    agente?: { nombre: string; apellido: string }
  }
  distribucionModulos: { moduloHorarioId: number }[]
}

const ORDEN_DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]
const LABEL_DIAS: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
}

export default function ModulosDistribucionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  const [id,           setId]           = useState("")
  const [dist,         setDist]         = useState<Distribucion | null>(null)
  const [modulos,      setModulos]      = useState<Modulo[]>([])
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [loading,      setLoading]      = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [guardado,     setGuardado]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  useEffect(() => {
    if (!id || authHeaders.Authorization === "Bearer ") return

    async function cargar() {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/modulosHorarios",      { headers: authHeaders }),
          fetch(`/api/distribuciones/${id}`, { headers: authHeaders }),
        ])
        if (!r1.ok || !r2.ok) throw new Error()
        const modulosData = await r1.json()
        const distData    = await r2.json()
        setModulos(modulosData)
        setDist(distData)
        setSeleccionados((distData.distribucionModulos ?? []).map((x: any) => x.moduloHorarioId))
      } catch {
        setError("Error cargando datos")
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [id, authHeaders.Authorization])

  const agrupados = useMemo(() => {
    const grupos = new Map<string, Modulo[]>()
    for (const dia of ORDEN_DIAS) grupos.set(dia, [])
    for (const m of modulos) grupos.get(m.dia_semana)?.push(m)
    for (const lista of grupos.values()) lista.sort((a, b) => a.hora_desde - b.hora_desde)
    return grupos
  }, [modulos])

  function toggle(moduloId: number) {
    setSeleccionados(prev =>
      prev.includes(moduloId) ? prev.filter(x => x !== moduloId) : [...prev, moduloId]
    )
    setGuardado(false)
  }

  function toggleDia(dia: string) {
    const lista = agrupados.get(dia) ?? []
    const ids   = lista.map(m => m.id)
    const todosSeleccionados = ids.every(id => seleccionados.includes(id))
    setSeleccionados(prev =>
      todosSeleccionados
        ? prev.filter(id => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    )
    setGuardado(false)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    setGuardado(false)
    try {
      const res = await fetch(`/api/distribuciones/${id}/modulos`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ modulos: seleccionados }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error guardando"); return }
      setGuardado(true)
    } catch {
      setError("Error de red")
    } finally {
      setGuardando(false)
    }
  }

  const totalSeleccionados = seleccionados.length

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando módulos...
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>

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
            Módulos horarios
          </h1>
          {dist && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                {dist.asignacion.identificadorEstructural}
              </span>
              {dist.asignacion.agente && (
                <span> · {dist.asignacion.agente.apellido}, {dist.asignacion.agente.nombre}</span>
              )}
              <span style={{ color: "var(--color-text-hint)" }}> · v{dist?.version}</span>
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {totalSeleccionados > 0 && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              {totalSeleccionados} módulo{totalSeleccionados !== 1 ? "s" : ""} seleccionado{totalSeleccionados !== 1 ? "s" : ""}
            </span>
          )}
          {guardado && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success-text)", fontWeight: "var(--font-medium)" }}>
              ✓ Guardado
            </span>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Guardar módulos"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Grilla de días */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--space-3)",
        alignItems: "start",
      }}>
        {ORDEN_DIAS.map(dia => {
          const lista = agrupados.get(dia) ?? []
          if (lista.length === 0) return null

          const todosDelDia     = lista.map(m => m.id)
          const todosSeleccionados = todosDelDia.every(id => seleccionados.includes(id))
          const algunoSeleccionado = todosDelDia.some(id => seleccionados.includes(id))

          return (
            <div
              key={dia}
              style={{
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)", overflow: "hidden",
              }}
            >
              {/* Cabecera del día con checkbox "todos" */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "10px 12px", borderBottom: "1px solid var(--color-border)",
                  background: algunoSeleccionado ? "var(--color-surface-raised)" : "var(--color-surface)",
                  cursor: "pointer",
                }}
                onClick={() => toggleDia(dia)}
              >
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  ref={el => { if (el) el.indeterminate = algunoSeleccionado && !todosSeleccionados }}
                  onChange={() => toggleDia(dia)}
                  onClick={e => e.stopPropagation()}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
                  {LABEL_DIAS[dia]}
                </span>
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)", marginLeft: "auto" }}>
                  {todosDelDia.filter(id => seleccionados.includes(id)).length}/{lista.length}
                </span>
              </div>

              {/* Módulos del día */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {lista.map(m => {
                  const sel = seleccionados.includes(m.id)
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                        padding: "8px 12px", cursor: "pointer",
                        background: sel ? "var(--color-accent-bg, #f0f8ff)" : "transparent",
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background 0.1s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggle(m.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                        {minutosAHora(m.hora_desde)}–{minutosAHora(m.hora_hasta)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {modulos.length === 0 && (
        <div style={{ padding: "var(--space-12)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          No hay módulos horarios configurados para esta institución
        </div>
      )}

    </div>
  )
}
