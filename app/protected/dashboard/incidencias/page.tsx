"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useIncidencias, IncidenciasTable, IncidenciaFilters, ModalConfirmar } from "@/features/incidencias"

export default function IncidenciasPage() {
  const router = useRouter()
  const {
    incidenciasFiltradas,
    loading,
    error,
    busqueda,
    setBusqueda,
    verEliminadas,
    setVerEliminadas,
    eliminar,
    reactivar,
    clearError,
  } = useIncidencias()

  const [confirmarId, setConfirmarId] = useState<number | null>(null)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencias...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta incidencia? Esta acción no se puede deshacer."
          onConfirmar={() => { eliminar(confirmarId); setConfirmarId(null) }}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>Incidencias</h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {incidenciasFiltradas.length} incidencia{incidenciasFiltradas.length !== 1 ? "s" : ""}
              {!verEliminadas && (" activa" + (incidenciasFiltradas.length !== 1 ? "s" : ""))}
            </p>
          </div>
          <button
            onClick={() => router.push("/protected/dashboard/incidencias/nueva")}
            style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
          >
            + Nueva incidencia
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={clearError} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        <IncidenciaFilters
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          verEliminadas={verEliminadas}
          setVerEliminadas={setVerEliminadas}
        />

        <IncidenciasTable
          incidencias={incidenciasFiltradas}
          verEliminadas={verEliminadas}
          onEliminar={setConfirmarId}
          onReactivar={reactivar}
        />

      </div>
    </>
  )
}