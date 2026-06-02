// app/protected/dashboard/asignaciones/[id]/page.tsx
"use client"

import { useParams } from "next/navigation"
import {
  useAsignacionDetalle,
  ModalConfirmar,
  AsignacionDetalleHeader,
  TitularCard,
  CargoCard,
  DistribucionesCard,
  IncidenciasCard,
  CambiarTitularForm,
} from "@/features/asignaciones"
import type { AsignacionFormData } from "@/features/asignaciones"

export default function AsignacionDetallePage() {
  const params = useParams()
  const id     = params?.id as string

  const {
    asignacion, loading, error, setError,
    confirmar, setConfirmar,
    titular, contexto, eliminar,
    puedeEliminar, motivoBloqueoEliminar,
    tieneHistorial, motivoBloqueoEditar,
    mostrarCambioTitular, agentes, agenteId, setAgenteId,
    guardando, abrirCambiarTitular, cancelarCambioTitular, guardarCambioTitular,
  } = useAsignacionDetalle(id)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando asignación...
    </div>
  )

  if (!asignacion) return (
    <div style={{ padding: "var(--space-8)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
      {error ?? "Asignación no encontrada"}
    </div>
  )

  // Adaptar agenteId al formato que espera CambiarTitularForm
  const formTitular: AsignacionFormData = {
    agenteId: agenteId,
    unidadId: "", identificadorEstructural: "", fecha_inicio: "",
    fecha_fin: "", materiaId: "", cursoId: "", comisionId: "", turnoId: "",
  }

  return (
    <>
      {confirmar && (
        <ModalConfirmar
          mensaje="¿Eliminar esta asignación? Se eliminará toda su información asociada."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmar(false)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1100 }}>

        <AsignacionDetalleHeader
          asignacion={asignacion}
          titular={titular}
          contexto={contexto}
          onEliminar={() => setConfirmar(true)}
          puedeEliminar={puedeEliminar}
          motivoBloqueoEliminar={motivoBloqueoEliminar}
          tieneHistorial={tieneHistorial}
          motivoBloqueoEditar={motivoBloqueoEditar}
        />

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-error)", fontSize: "var(--text-base)", lineHeight: 1 }}>×</button>
          </div>
        )}

        {mostrarCambioTitular ? (
          <CambiarTitularForm
            form={formTitular}
            agentes={agentes}
            guardando={guardando}
            onCampo={(key, value) => { if (key === "agenteId") setAgenteId(value) }}
            onGuardar={guardarCambioTitular}
            onCancelar={cancelarCambioTitular}
          />
        ) : (
          <TitularCard
            titular={titular}
            onCambiarTitular={abrirCambiarTitular}
          />
        )}

        <CargoCard asignacion={asignacion} />
        <DistribucionesCard distribuciones={asignacion.distribuciones ?? []} />
        <IncidenciasCard incidencias={asignacion.incidencias ?? []} />

        {(asignacion.distribuciones?.length ?? 0) === 0 && (asignacion.incidencias?.length ?? 0) === 0 && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-8)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)" }}>
            Sin distribuciones ni incidencias registradas
          </div>
        )}

      </div>
    </>
  )
}
