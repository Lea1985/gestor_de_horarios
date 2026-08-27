// app/protected/dashboard/incidencias/nueva/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import {
  useNuevaIncidencia,
} from "@/features/incidencias/hooks/useNuevaIncidencia"
import {
  Stepper,
  PasoSeleccion,
  PasoRevision,
  PasoFormulario,
  PasoReemplazos,
  ResultadoCarga,
} from "@/features/incidencias"

// ── Tipo Agente para paso 4 ───────────────────────────────────
type Agente = { id: number; nombre: string; apellido: string }

export default function NuevaIncidenciaPage() {
  const { authHeaders } = useAuth()
  const router          = useRouter()

  const {
    // base
    loadingBase, error, setError,
    paso, setPaso,
    // paso 1
    filtroTexto, setFiltroTexto,
    filtroCurso, setFiltroCurso,
    cursosUnicos,
    asignacionesFiltradas,
    asignacionesLote,
    seleccionados,
    toggleSeleccion, toggleTodos, quitarDelLote,
    // paso 3
    codigarios, items, loadingItems,
    datos, setDatos,
    datosErr, setDatosErr,
    guardando,
    resultado, setResultado,
    resultadoReemplazos,
    reintentarFallidas,
    // paso 4
    clasesAgrupadasPorAsignacion,
    clasesSeleccionadas,
    reemplazos,
    suplenteGlobal, setSuplenteGlobal,
    loadingClases,
    guardandoReemplazos,
    clasesConSuplenteIncompleto,
    toggleClase,
    toggleTodasClases,
    setSuplenteClase,
    aplicarSuplenteGlobal,
    // acciones
    guardarLoteYContinuar,
    guardarReemplazos,
    saltearReemplazos,
  } = useNuevaIncidencia()

  // ── Agentes para el selector de suplentes ────────────────────
  const [agentes, setAgentes] = useState<Agente[]>([])

  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    fetch("/api/agentes", { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAgentes(
        // la API devuelve agentes; normalizamos por si viene paginado
        Array.isArray(data) ? data : (data.items ?? data.agentes ?? [])
      ))
      .catch(() => {})
  }, [authHeaders.Authorization])

  if (loadingBase) return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "var(--space-12)",
      color:          "var(--color-text-hint)",
      fontSize:       "var(--text-sm)",
    }}>
      Cargando...
    </div>
  )

  // ── Resultado final (paso 5) ─────────────────────────────────
  // El hook setea paso a 5 al terminar los reemplazos o saltar
  if ((paso as number) === 5 && resultado) {
    return (
      <div style={{ maxWidth: 700 }}>
        <button
          onClick={() => router.push("/protected/dashboard/incidencias")}
          style={{
            border:      "none",
            background:  "none",
            color:       "var(--color-accent)",
            cursor:      "pointer",
            padding:     0,
            fontSize:    "var(--text-xs)",
            fontWeight:  "var(--font-medium)",
            marginBottom: "var(--space-4)",
          }}
        >
          ← Volver a incidencias
        </button>
        <ResultadoCarga
          resultado={resultado}
          resultadoReemplazos={resultadoReemplazos}
          onReintentar={reintentarFallidas}
        />
      </div>
    )
  }

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      gap:           "var(--space-6)",
      maxWidth:      paso === 4 ? 1000 : 900,
    }}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/protected/dashboard/incidencias")}
          style={{
            border:       "none",
            background:   "none",
            color:        "var(--color-accent)",
            cursor:       "pointer",
            padding:      0,
            fontSize:     "var(--text-xs)",
            fontWeight:   "var(--font-medium)",
            marginBottom: "var(--space-2)",
          }}
        >
          ← Volver
        </button>
        <h1 style={{
          fontSize:   "var(--text-xl)",
          fontWeight: "var(--font-medium)",
          color:      "var(--color-text-primary)",
        }}>
          Nueva incidencia
        </h1>
        <p style={{
          fontSize:  "var(--text-sm)",
          color:     "var(--color-text-secondary)",
          marginTop: "var(--space-1)",
        }}>
          {paso < 4
            ? "Podés cargar la misma incidencia a múltiples asignaciones a la vez"
            : "Asigná reemplazos a las clases afectadas (opcional)"
          }
        </p>
      </div>

      <Stepper paso={paso <= 4 ? paso as 1 | 2 | 3 | 4 : 4} />

      {/* Error global */}
      {error && (
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "var(--space-2)",
          padding:      "10px 14px",
          borderRadius: "var(--radius-md)",
          background:   "var(--color-error-bg)",
          border:       "1px solid var(--color-error)",
          fontSize:     "var(--text-xs)",
          color:        "var(--color-error)",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              color:      "var(--color-error)",
              fontSize:   "var(--text-base)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── PASO 1 ── */}
      {paso === 1 && (
        <PasoSeleccion
          asignacionesFiltradas={asignacionesFiltradas}
          cursosUnicos={cursosUnicos}
          seleccionados={seleccionados}
          filtroTexto={filtroTexto}
          filtroCurso={filtroCurso}
          setFiltroTexto={setFiltroTexto}
          setFiltroCurso={setFiltroCurso}
          toggleSeleccion={toggleSeleccion}
          toggleTodos={toggleTodos}
          onContinuar={() => { if (seleccionados.length > 0) setPaso(2) }}
        />
      )}

      {/* ── PASO 2 ── */}
      {paso === 2 && (
        <PasoRevision
          asignacionesLote={asignacionesLote}
          onVolver={() => setPaso(1)}
          onContinuar={() => { if (asignacionesLote.length > 0) setPaso(3) }}
          onQuitar={quitarDelLote}
        />
      )}

      {/* ── PASO 3 ── */}
      {paso === 3 && (
        <PasoFormulario
          asignacionesLote={asignacionesLote}
          codigarios={codigarios}
          items={items}
          loadingItems={loadingItems}
          datos={datos}
          datosErr={datosErr}
          guardando={guardando}
          setDatos={setDatos}
          setDatosErr={setDatosErr}
          onVolver={() => setPaso(2)}
          onGuardar={guardarLoteYContinuar}
        />
      )}

      {/* ── PASO 4: Reemplazos ── */}
      {paso === 4 && (
        <PasoReemplazos
          grupos={clasesAgrupadasPorAsignacion}
          clasesSeleccionadas={clasesSeleccionadas}
          reemplazos={reemplazos}
          agentes={agentes}
          suplenteGlobal={suplenteGlobal}
          loadingClases={loadingClases}
          guardandoReemplazos={guardandoReemplazos}
          clasesConSuplenteIncompleto={clasesConSuplenteIncompleto}
          onToggleClase={toggleClase}
          onToggleTodas={toggleTodasClases}
          onSetSuplente={setSuplenteClase}
          onSetSuplenteGlobal={setSuplenteGlobal}
          onAplicarGlobal={aplicarSuplenteGlobal}
          onGuardar={guardarReemplazos}
          onSaltar={saltearReemplazos}
        />
      )}

    </div>
  )
}