// app/protected/dashboard/incidencias/[id]/page.tsx
"use client"

import { useRouter, useParams } from "next/navigation"
import {
  useIncidenciaDetalle,
  useClasesAfectadas,
  ModalConfirmar,
  IncidenciaDetalleHeader,
  CadenaTable,
  ClasesAfectadasTable,
  ModalReemplazo,
  ModalAusenciaSuplente,
} from "@/features/incidencias"

export default function IncidenciaDetallePage() {
  const router = useRouter()
  const params = useParams()
  const id     = params?.id as string

  const {
    incidencia, cadena, cobertura, loading, error, setError,
    confirmar, setConfirmar, eliminar,
    confirmarReactivar, setConfirmarReactivar, reactivar,
    recargar,
  } = useIncidenciaDetalle(id)

  const asignacionTitularId = incidencia?.asignacionId ?? 0

  const {
    clases, agentes, loading: loadingClases, error: errorClases,
    claseSeleccionada,
    suplenteId, setSuplenteId,
    observacionReemplazo, setObservacionReemplazo,
    guardandoReemplazo, errorReemplazo,
    abrirModal, cerrarModal, confirmarReemplazo, eliminarReemplazo,
    modalAusencia, abrirModalAusencia, cerrarModalAusencia,
  } = useClasesAfectadas(id, asignacionTitularId, recargar)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando incidencia...
    </div>
  )

  if (!incidencia) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      Incidencia no encontrada
    </div>
  )

  const esEliminada      = !incidencia.activo
  const tieneHijos       = (incidencia.hijos?.length ?? 0) > 0
  const tieneReemplazos  = clases.some(c => c.reemplazos.some(r => r.activo))
  const puedeEditar      = !tieneHijos && !tieneReemplazos
  const puedeEliminar    = !tieneHijos && !tieneReemplazos

  const motivoBloqueo = tieneHijos
    ? "Tiene incidencias hijas en la cadena"
    : tieneReemplazos
    ? "Tiene reemplazos asignados en sus clases"
    : null

  const reemplazoActivoIncidencia = clases
    .flatMap(c => c.reemplazos)
    .find(r => r.activo) ?? null

  return (
    <>
      {confirmar && (
        <ModalConfirmar
          mensaje="¿Eliminar esta incidencia? Esta acción no se puede deshacer."
          onConfirmar={async () => {
            const ok = await eliminar()
            if (ok) router.push("/protected/dashboard/incidencias")
          }}
          onCancelar={() => setConfirmar(false)}
        />
      )}

      {confirmarReactivar && (
        <ModalConfirmar
          mensaje="¿Reactivar esta incidencia?"
          labelConfirmar="Reactivar"
          onConfirmar={reactivar}
          onCancelar={() => setConfirmarReactivar(false)}
        />
      )}

      {claseSeleccionada && (
        <ModalReemplazo
          clase={claseSeleccionada}
          agentes={agentes}
          agenteId={suplenteId}
          setAgenteId={setSuplenteId}
          observacion={observacionReemplazo}
          setObservacion={setObservacionReemplazo}
          guardando={guardandoReemplazo}
          error={errorReemplazo}
          onConfirmar={confirmarReemplazo}
          onCancelar={cerrarModal}
        />
      )}

      {modalAusencia && (
        <ModalAusenciaSuplente
          incidenciaPadreId={incidencia.id}
          asignacionId={incidencia.asignacionId}
          asignacionTitularId={asignacionTitularId}
          fechaMaxima={incidencia.fecha_hasta}
          nombreSuplente={modalAusencia.nombreSuplente}
          agentes={agentes}
          onCreada={(nuevaId) => {
            cerrarModalAusencia()
            router.push(`/protected/dashboard/incidencias/${nuevaId}`)
          }}
          onCancelar={cerrarModalAusencia}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <button
              onClick={() => router.push("/protected/dashboard/incidencias")}
              style={{ border: "none", background: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", marginBottom: "var(--space-2)" }}
            >
              ← Volver a incidencias
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)" }}>
                Incidencia #{incidencia.id}
              </h1>
              {esEliminada && (
                <span style={{ fontSize: "var(--text-2xs)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", color: "var(--color-text-hint)", border: "1px solid var(--color-border)" }}>
                  Eliminada
                </span>
              )}
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {incidencia.codigarioItem
                ? `${incidencia.codigarioItem.codigo} — ${incidencia.codigarioItem.nombre}`
                : "Sin tipo"
              }
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
            {esEliminada ? (
              <button
                onClick={() => setConfirmarReactivar(true)}
                style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
              >
                Reactivar
              </button>
            ) : (
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {reemplazoActivoIncidencia && (
                  <button
                    onClick={() => abrirModalAusencia(
                      reemplazoActivoIncidencia.id,
                      reemplazoActivoIncidencia.agenteSuplente
                        ? `${reemplazoActivoIncidencia.agenteSuplente.apellido}, ${reemplazoActivoIncidencia.agenteSuplente.nombre}`
                        : "—"
                    )}
                    style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: "var(--color-text-primary)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: "pointer" }}
                  >
                    Ausencia del suplente
                  </button>
                )}
                <button
                  onClick={() => puedeEditar && router.push(`/protected/dashboard/incidencias/editar/${id}`)}
                  disabled={!puedeEditar}
                  title={!puedeEditar ? motivoBloqueo ?? undefined : undefined}
                  style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", background: "transparent", color: puedeEditar ? "var(--color-text-primary)" : "var(--color-text-hint)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: puedeEditar ? "pointer" : "not-allowed", opacity: puedeEditar ? 1 : 0.5 }}
                >
                  Editar
                </button>
                <button
                  onClick={() => puedeEliminar && setConfirmar(true)}
                  disabled={!puedeEliminar}
                  title={!puedeEliminar ? motivoBloqueo ?? undefined : undefined}
                  style={{ padding: "9px 16px", borderRadius: "var(--radius-lg)", border: "none", background: puedeEliminar ? "var(--color-error)" : "var(--color-surface-raised)", color: puedeEliminar ? "white" : "var(--color-text-hint)", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", cursor: puedeEliminar ? "pointer" : "not-allowed", opacity: puedeEliminar ? 1 : 0.5 }}
                >
                  Eliminar
                </button>
              </div>
            )}
            {!esEliminada && motivoBloqueo && (
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>
                {motivoBloqueo}
              </span>
            )}
          </div>
        </div>

        {/* Error incidencia */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Error clases */}
        {errorClases && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }} role="alert">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {errorClases}
          </div>
        )}

        <IncidenciaDetalleHeader incidencia={incidencia} clases={clases} cobertura={cobertura} />

        {/* Clases afectadas — solo para incidencias activas */}
        {!esEliminada && (
          loadingClases ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
              Cargando clases...
            </div>
          ) : (
            <ClasesAfectadasTable
              clases={clases}
              esRaiz={!incidencia.padre}
              onAgregarReemplazo={abrirModal}
              onEliminarReemplazo={eliminarReemplazo}
            />
          )
        )}

        <CadenaTable cadena={cadena} idActual={incidencia.id} />

      </div>
    </>
  )
}