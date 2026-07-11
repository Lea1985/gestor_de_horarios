// app/protected/dashboard/distribuciones/[id]/modulos/page.tsx
"use client"
import { useEffect, useState } from "react"
import {
  useModulosDistribucion,
  ModalNuevaVersion,
  ModalMigrarReemplazos,
  ModulosHeader,
  ModulosGrid,
} from "@/features/modulosDistribucion"

export default function ModulosDistribucionPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("")
  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  const {
    dist, modulos, seleccionados, agrupados,
    loading, guardando, guardado, error, setError,
    esActivo, tieneModulos, checkboxHabilitado, totalSeleccionados,
    editando, setEditando, modalVersion, setModalVersion, creandoVersion,
    tramoAConfirmar, cancelarMigracion, avisoSinPeriodo,
    toggle, toggleDia, cancelarEdicion, guardar, crearNuevaVersion,
  } = useModulosDistribucion(id)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-12)", color: "var(--color-text-hint)", fontSize: "var(--text-sm)" }}>
      Cargando módulos...
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      {modalVersion && (
        <ModalNuevaVersion
          onConfirmar={crearNuevaVersion}
          onCancelar={() => setModalVersion(false)}
          guardando={creandoVersion}
        />
      )}

      {tramoAConfirmar && (
        <ModalMigrarReemplazos
          tramo={tramoAConfirmar}
          onConfirmar={(mantenerReemplazo) => guardar(mantenerReemplazo)}
          onCancelar={cancelarMigracion}
          guardando={guardando}
        />
      )}

      <ModulosHeader
        dist={dist}
        esActivo={esActivo}
        tieneModulos={tieneModulos}
        editando={editando}
        guardando={guardando}
        guardado={guardado}
        totalSeleccionados={totalSeleccionados}
        onGuardar={() => guardar()}
        onEditar={() => setEditando(true)}
        onCancelarEdicion={cancelarEdicion}
        onNuevaVersion={() => setModalVersion(true)}
      />

      {!esActivo && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          Esta versión está inactiva — solo lectura.
        </div>
      )}

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

      {guardado && avisoSinPeriodo && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          Módulos guardados. No hay período operativo <strong>ACTIVO</strong> todavía, así que no se generó ninguna clase — se van a generar automáticamente cuando actives un período.
        </div>
      )}

      <ModulosGrid
        agrupados={agrupados}
        seleccionados={seleccionados}
        checkboxHabilitado={checkboxHabilitado}
        onToggle={toggle}
        onToggleDia={toggleDia}
      />

      {modulos.length === 0 && (
        <div style={{ padding: "var(--space-12)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-hint)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          {esActivo ? "Seleccioná los módulos horarios y guardá." : "Esta versión no tiene módulos asignados."}
        </div>
      )}
    </div>
  )
}
