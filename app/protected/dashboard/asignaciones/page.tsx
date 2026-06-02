// app/protected/dashboard/asignaciones/page.tsx
"use client"

import {
  useAsignaciones,
  ModalConfirmar,
  AsignacionFilters,
  AsignacionForm,
  CambiarTitularForm,
  AsignacionesTable,
} from "@/features/asignaciones"

export default function AsignacionesPage() {
  const {
    asignacionesFiltradas,
    agentes, unidades, materias, turnos,
    comisionesDeUnidad, materiasFiltradas, unidadTieneComisiones,
    loading, loadingCombos, guardando, error, setError,
    mostrarForm, mostrarCambioTitular, editando, tieneHistorial,
    confirmarId, setConfirmarId,
    busqueda, setBusqueda, verInactivas, setVerInactivas,
    form, setCampo, onUnidadChange, onComisionChange,
    abrirCrear, abrirEditar, abrirCambiarTitular, cancelar,
    guardarAsignacion, eliminar, reactivar, guardarCambioTitular,
  } = useAsignaciones()

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignaciones...
    </div>
  )

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmar
          mensaje="¿Eliminar esta asignación? Esta acción no se puede deshacer."
          onConfirmar={() => eliminar(confirmarId)}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
              Asignaciones
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {asignacionesFiltradas.length} asignación{asignacionesFiltradas.length !== 1 ? "es" : ""}
              {!verInactivas && (" activa" + (asignacionesFiltradas.length !== 1 ? "s" : ""))}
            </p>
          </div>
          {!mostrarForm && !mostrarCambioTitular && (
            <button
              onClick={abrirCrear}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-primary)", color: "white", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
            >
              + Nueva asignación
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

        {/* Formulario nueva / editar */}
        {mostrarForm && (
          <AsignacionForm
            form={form}
            editando={editando}
            tieneHistorial={tieneHistorial}
            loadingCombos={loadingCombos}
            guardando={guardando}
            agentes={agentes}
            unidades={unidades}
            materias={materias}
            comisiones={[]}
            turnos={turnos}
            comisionesDeUnidad={comisionesDeUnidad}
            materiasFiltradas={materiasFiltradas}
            unidadTieneComisiones={unidadTieneComisiones}
            onCampo={setCampo}
            onUnidadChange={onUnidadChange}
            onComisionChange={onComisionChange}
            onGuardar={guardarAsignacion}
            onCancelar={cancelar}
          />
        )}

        {/* Cambiar titular */}
        {mostrarCambioTitular && (
          <CambiarTitularForm
            form={form}
            agentes={agentes}
            guardando={guardando}
            onCampo={setCampo}
            onGuardar={guardarCambioTitular}
            onCancelar={cancelar}
          />
        )}

        {/* Filtros */}
        {!mostrarForm && !mostrarCambioTitular && (
          <AsignacionFilters
            busqueda={busqueda}
            verInactivas={verInactivas}
            onBusqueda={setBusqueda}
            onVerInactivas={setVerInactivas}
          />
        )}

        {/* Tabla */}
        <AsignacionesTable
          asignaciones={asignacionesFiltradas}
          verInactivas={verInactivas}
        />

      </div>
    </>
  )
}
