// features/asignaciones/components/CargoCard.tsx

import type { AsignacionDetalle } from "../hooks/useAsignacionDetalle"

const s = {
  label: {
    fontSize:     "var(--text-xs)",
    fontWeight:   "var(--font-medium)" as const,
    color:        "var(--color-text-secondary)",
    display:      "block" as const,
    marginBottom: "var(--space-1)",
  },
  value: {
    fontSize:   "var(--text-sm)",
    color:      "var(--color-text-primary)",
    fontWeight: "var(--font-medium)" as const,
  },
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={s.label}>{label}</span>
      <div style={s.value}>{children}</div>
    </div>
  )
}

type Props = {
  asignacion: AsignacionDetalle
}

export function CargoCard({ asignacion }: Props) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)" }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
        Cargo
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
        <Campo label="Unidad">
          {asignacion.unidad.nombre}
          <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text-hint)", fontWeight: 400 }}>
            #{asignacion.unidad.codigoUnidad}
          </span>
        </Campo>
        <Campo label="Fecha inicio">
          {asignacion.fecha_inicio.split("T")[0]}
        </Campo>
        <Campo label="Fecha fin">
          {asignacion.fecha_fin
            ? asignacion.fecha_fin.split("T")[0]
            : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Indefinida</span>}
        </Campo>
        {asignacion.comision && <Campo label="Comisión">{asignacion.comision.nombre}</Campo>}
        {asignacion.turno    && <Campo label="Turno">{asignacion.turno.nombre}</Campo>}
        {asignacion.materia  && <Campo label="Materia">{asignacion.materia.nombre}</Campo>}
      </div>
    </div>
  )
}