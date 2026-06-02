//features/incidencias/components/IncidenciaDetalleHeader.tsx
import { useRouter } from "next/navigation"
import type { IncidenciaDetalle } from "../types"
import { Campo } from "./Campo"
import { LinkIncidencia } from "./LinkIncidencia"

function diasEntre(desde: string, hasta: string): number {
  const d1 = new Date(desde)
  const d2 = new Date(hasta)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

const card = {
  background:   "var(--color-surface)",
  border:       "1px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
}

export function IncidenciaDetalleHeader({ incidencia }: { incidencia: IncidenciaDetalle }) {
  const router  = useRouter()
  const agente  = incidencia.asignacion?.titularidades[0]?.agente ?? null
  const dias    = diasEntre(incidencia.fecha_desde, incidencia.fecha_hasta)

  return (
    <>
      {/* Agente y asignación */}
      <div style={{ ...card, padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
          Agente y asignación
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
          <Campo label="Agente">
            {agente
              ? `${agente.apellido}, ${agente.nombre}`
              : incidencia.asignacion
                ? <em style={{ fontWeight: 400, color: "var(--color-text-hint)" }}>Vacante</em>
                : `#${incidencia.asignacionId}`
            }
          </Campo>
          <Campo label="Documento">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
              {agente?.documento ?? "—"}
            </span>
          </Campo>
          <Campo label="Unidad">
            {incidencia.asignacion
              ? `${incidencia.asignacion.unidad.nombre} (#${incidencia.asignacion.unidad.codigoUnidad})`
              : "—"
            }
          </Campo>
          <Campo label="Identificador estructural">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
              {incidencia.asignacion?.identificadorEstructural ?? "—"}
            </span>
          </Campo>
        </div>
      </div>

      {/* Datos de la incidencia */}
      <div style={{ ...card, padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
          Datos de la incidencia
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>

          <Campo label="Tipo">
            {incidencia.codigarioItem
              ? `${incidencia.codigarioItem.codigo} — ${incidencia.codigarioItem.nombre}`
              : "—"
            }
          </Campo>

          <Campo label="Fecha desde">
            {incidencia.fecha_desde?.slice(0, 10)}
          </Campo>

          <Campo label="Fecha hasta">
            {incidencia.fecha_hasta?.slice(0, 10)}
          </Campo>

          <Campo label="Duración">
            {dias} día{dias !== 1 ? "s" : ""}
          </Campo>

          <Campo label="Incidencia padre">
            {incidencia.padre?.id
              ? <LinkIncidencia
                  id={incidencia.padre.id}
                  actual={false}
                  onClick={() => router.push(`/protected/dashboard/incidencias/${incidencia.padre!.id}`)}
                />
              : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin padre</span>
            }
          </Campo>

          <Campo label="Incidencias hijas">
            {!incidencia.hijos?.length
              ? <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin hijos</span>
              : (
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "var(--space-2)" }}>
                  {incidencia.hijos.map(h => (
                    <LinkIncidencia
                      key={h.id}
                      id={h.id}
                      actual={false}
                      onClick={() => router.push(`/protected/dashboard/incidencias/${h.id}`)}
                    />
                  ))}
                </div>
              )
            }
          </Campo>

          <div style={{ gridColumn: "1 / -1" }}>
            <Campo label="Observación">
              {incidencia.observacion
                ? <span style={{ fontWeight: 400 }}>{incidencia.observacion}</span>
                : <span style={{ color: "var(--color-text-hint)", fontWeight: 400 }}>Sin observaciones</span>
              }
            </Campo>
          </div>

        </div>
      </div>
    </>
  )
}