//features/incidencias/components/IncidenciaDetalleHeader.tsx
import { useRouter } from "next/navigation"
import type { IncidenciaDetalle, ClaseAfectada, TramoCobertura } from "../types"
import { Campo } from "./Campo"
import { LinkIncidencia } from "./LinkIncidencia"
import { titularVigenteEn } from "../utils/titularVigenteEn"
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
export function IncidenciaDetalleHeader({ incidencia, clases, cobertura }: {
  incidencia: IncidenciaDetalle
  clases:     ClaseAfectada[]
  cobertura:  TramoCobertura[]
}) {
  const router = useRouter()
  const esSuplente = !!incidencia.padre?.asignacion
  const reemplazosOrdenados = [...(clases[0]?.reemplazos ?? [])].sort((a, b) => a.id - b.id)
  const inactivos = reemplazosOrdenados.filter(r => !r.activo)
  const suplenteSaliente = inactivos[inactivos.length - 1]?.agenteSuplente ?? null
  const suplenteEntrante = reemplazosOrdenados.find(r => r.activo)?.agenteSuplente ?? null
  const agente = esSuplente
    ? suplenteSaliente
    : titularVigenteEn(incidencia.asignacion?.titularidades, incidencia.raizFechaDesde ?? incidencia.fecha_desde)
  const dias = diasEntre(incidencia.fecha_desde, incidencia.fecha_hasta)
  const titularOriginal  = titularVigenteEn(incidencia.padre?.asignacion?.titularidades, incidencia.raizFechaDesde ?? incidencia.padre?.fecha_desde)
  const unidadOriginal   = incidencia.padre?.asignacion?.unidad ?? null
  const comisionOriginal = incidencia.padre?.asignacion?.comision ?? null
  return (
    <>
      {esSuplente && (
        <div style={{
          background:    "var(--color-surface)",
          border:        "1px solid var(--color-accent)",
          borderLeft:    "4px solid var(--color-accent)",
          borderRadius:  "var(--radius-xl)",
          padding:       "var(--space-4) var(--space-6)",
          display:       "flex",
          flexDirection: "column" as const,
          gap:           "var(--space-3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-accent)", flexShrink: 0 }}>
              <path d="M5.5 8.5a3 3 0 0 0 4.243 0l1.414-1.414a3 3 0 0 0-4.243-4.243L5.5 4.257" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M8.5 5.5a3 3 0 0 0-4.243 0L2.843 6.914a3 3 0 0 0 4.243 4.243L8.5 9.743" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>
              Incidencia de reemplazante
            </span>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
            {suplenteSaliente
              ? <><strong style={{ color: "var(--color-text-primary)" }}>{suplenteSaliente.apellido}, {suplenteSaliente.nombre}</strong> estaba cubriendo como reemplazante</>
              : "Este agente estaba cubriendo como reemplazante"
            }
            {titularOriginal && (
              <> al titular <strong style={{ color: "var(--color-text-primary)" }}>{titularOriginal.apellido}, {titularOriginal.nombre}</strong></>
            )}
            {unidadOriginal && (
              <> en <strong style={{ color: "var(--color-text-primary)" }}>{unidadOriginal.nombre}</strong></>
            )}
            {comisionOriginal && (
              <> — <strong style={{ color: "var(--color-text-primary)" }}>{comisionOriginal.curso?.nombre} {comisionOriginal.nombre}</strong></>
            )}.
            {suplenteEntrante && suplenteSaliente && (
              <> Ahora <strong style={{ color: "var(--color-text-primary)" }}>{suplenteEntrante.apellido}, {suplenteEntrante.nombre}</strong> reemplaza a <strong style={{ color: "var(--color-text-primary)" }}>{suplenteSaliente.apellido}, {suplenteSaliente.nombre}</strong>.</>
            )}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
              Incidencia del titular:
            </span>
            <button
              onClick={() => router.push(`/protected/dashboard/incidencias/${incidencia.padre!.id}`)}
              style={{
                background:   "rgba(30,155,184,0.08)",
                border:       "none",
                padding:      "2px 8px",
                borderRadius: "var(--radius-full)",
                fontSize:     "var(--text-xs)",
                fontWeight:   "var(--font-medium)",
                color:        "var(--color-accent)",
                cursor:       "pointer",
              }}
            >
              #{incidencia.padre!.id}
            </button>
            {incidencia.padre?.fecha_desde && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-hint)" }}>
                {incidencia.padre.fecha_desde.slice(0, 10)} → {incidencia.padre.fecha_hasta?.slice(0, 10)}
              </span>
            )}
          </div>
        </div>
      )}
      {!incidencia.padre && cobertura.length > 0 && (
        <div style={{
          background:    "var(--color-surface)",
          border:        "1px solid var(--color-border)",
          borderLeft:    "4px solid var(--color-accent)",
          borderRadius:  "var(--radius-xl)",
          padding:       "var(--space-4) var(--space-6)",
          display:       "flex",
          flexDirection: "column" as const,
          gap:           "var(--space-4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-accent)", flexShrink: 0 }}>
              <path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--color-accent)" }}>
              Cobertura por tramos
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "var(--space-3)" }}>
            {cobertura.map((t, i) => (
              <div
                key={i}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  gap:            "var(--space-3)",
                  paddingBottom:  i < cobertura.length - 1 ? "var(--space-3)" : 0,
                  borderBottom:   i < cobertura.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: 0 }}>
                  {t.suplente
                    ? <><strong style={{ color: "var(--color-text-primary)" }}>{t.suplente.apellido}, {t.suplente.nombre}</strong> cubrió como reemplazante al titular</>
                    : <em style={{ fontStyle: "normal", color: "var(--color-text-hint)" }}>Sin cobertura para el titular</em>
                  }
                  {" "}
                  {agente && <strong style={{ color: "var(--color-text-primary)" }}>{agente.apellido}, {agente.nombre}</strong>}
                  {incidencia.asignacion?.unidad && <> en <strong style={{ color: "var(--color-text-primary)" }}>{incidencia.asignacion.unidad.nombre}</strong></>}
                  {incidencia.asignacion?.comision && (
                    <> — <strong style={{ color: "var(--color-text-primary)" }}>{incidencia.asignacion.comision.curso?.nombre} {incidencia.asignacion.comision.nombre}</strong></>
                  )}.
                </p>
                <span style={{
                  fontSize:     "var(--text-xs)",
                  fontWeight:   "var(--font-medium)",
                  color:        t.suplente ? "var(--color-accent)" : "var(--color-error)",
                  background:   t.suplente ? "rgba(30,155,184,0.08)" : "var(--color-error-bg)",
                  padding:      "2px 8px",
                  borderRadius: "var(--radius-full)",
                  whiteSpace:   "nowrap" as const,
                }}>
                  {t.desde === t.hasta ? t.desde : `${t.desde} → ${t.hasta}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...card, padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", marginBottom: "var(--space-5)" }}>
          Agente y asignación
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)" }}>
          {esSuplente && titularOriginal && (
            <Campo label="Titular">
              {titularOriginal.apellido}, {titularOriginal.nombre}
            </Campo>
          )}
          <Campo label={esSuplente ? "Agente ausente" : "Agente"}>
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