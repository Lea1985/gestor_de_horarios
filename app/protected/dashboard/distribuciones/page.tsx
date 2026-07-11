// app/protected/dashboard/distribuciones/page.tsx
"use client"

import {
  useDistribuciones,
  DistribucionForm,
  DistribucionFilters,
  DistribucionList,
  SinDistribucionBadges,
} from "@/features/distribuciones"
import { SinModulosBadges } from "@/features/distribuciones/components/SinModulosBadges"
import { ModalEliminarConReemplazo } from "@/features/distribuciones/components/ModalEliminarConReemplazo"

function ModalConfirmar({ mensaje, onConfirmar, onCancelar }: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)" }}
      onClick={onCancelar}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
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

export default function DistribucionesPage() {
  const {
    distribuciones, loading, error, setError,
    gruposFiltrados, cursosUnicos, turnosUnicos,
    hayFiltros, asignacionesSinDist, distribucionesSinModulos,
    mostrarForm, guardando, confirmarId, setConfirmarId, expandidos,
    form, formErrors, setCampo, proximaVersion, asignaciones,
    abrirForm, cerrarForm, crear, eliminar, toggleExpandido, limpiarFiltros,
    confirmarEliminacion, cancelarEliminacion, tramoEliminacion,
    filtroTexto, setFiltroTexto,
    filtroCurso, setFiltroCurso,
    filtroTurno, setFiltroTurno,
    filtroEstado, setFiltroEstado,
  } = useDistribuciones()

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando distribuciones...
    </div>
  )

  return (
    <>
      {confirmarId !== null && tramoEliminacion === null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta distribución horaria? Se eliminarán también sus módulos asociados."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      {tramoEliminacion !== null && (
        <ModalEliminarConReemplazo
          tramo={tramoEliminacion}
          onConfirmar={confirmarEliminacion}
          onCancelar={cancelarEliminacion}
          guardando={guardando}
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
              {distribuciones.length} distribución{distribuciones.length !== 1 ? "es" : ""}
            </p>
          </div>
          {!mostrarForm && (
            <button
              onClick={abrirForm}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nueva distribución
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <DistribucionForm
            form={form}
            formErrors={formErrors}
            asignaciones={asignaciones}
            proximaVersion={proximaVersion}
            guardando={guardando}
            onCampo={setCampo}
            onCrear={crear}
            onCancelar={cerrarForm}
          />
        )}

        {/* Filtros */}
        {!mostrarForm && distribuciones.length > 0 && (
          <DistribucionFilters
            filtroTexto={filtroTexto}
            filtroCurso={filtroCurso}
            filtroTurno={filtroTurno}
            filtroEstado={filtroEstado}
            cursosUnicos={cursosUnicos}
            turnosUnicos={turnosUnicos}
            hayFiltros={hayFiltros}
            onTexto={setFiltroTexto}
            onCurso={setFiltroCurso}
            onTurno={setFiltroTurno}
            onEstado={setFiltroEstado}
            onLimpiar={limpiarFiltros}
          />
        )}

        {/* Resultado filtros */}
        {hayFiltros && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {gruposFiltrados.size === 0
              ? "Sin resultados para esa búsqueda"
              : `${gruposFiltrados.size} asignación${gruposFiltrados.size !== 1 ? "es" : ""} encontrada${gruposFiltrados.size !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Lista */}
        {distribuciones.length === 0 ? (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-12)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
            No hay distribuciones registradas
          </div>
        ) : (
          <DistribucionList
            gruposFiltrados={gruposFiltrados}
            expandidos={expandidos}
            hayFiltros={hayFiltros}
            onToggle={toggleExpandido}
            onEliminar={setConfirmarId}
            onLimpiarFiltros={limpiarFiltros}
          />
        )}

        {/* Distribuciones activas sin módulos asignados (no generan clases) */}
        {!hayFiltros && (
          <SinModulosBadges distribuciones={distribucionesSinModulos} />
        )}

        {/* Asignaciones sin distribución */}
        {!hayFiltros && (
          <SinDistribucionBadges asignaciones={asignacionesSinDist} />
        )}

      </div>
    </>
  )
}
