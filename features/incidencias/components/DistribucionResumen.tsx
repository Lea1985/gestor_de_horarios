import type { AsignacionParaIncidencia } from "../types"

const LABEL: Record<string, string> = {
  LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue",
  VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom",
}
const ORDEN = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

// Minutos desde medianoche -> "HH:MM" (misma lógica que usan los demás
// componentes de incidencias, que la definen cada uno por su cuenta).
function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type Tramo = { dia: string; desde: number; hasta: number }

// UX-INC-016: horarios (módulos contiguos del mismo día se funden en un
// tramo) + resumen de cantidad de módulos por día, como en /distribuciones.
export function DistribucionResumen({
  distribuciones,
}: {
  distribuciones: AsignacionParaIncidencia["distribuciones"]
}) {
  const modulos = (distribuciones[0]?.distribucionModulos ?? []).map(dm => dm.moduloHorario)
  if (modulos.length === 0) {
    return <span style={{ color: "var(--color-text-hint)" }}>—</span>
  }
  const ordenados = [...modulos].sort(
    (a, b) =>
      ORDEN.indexOf(a.dia_semana) - ORDEN.indexOf(b.dia_semana) ||
      a.hora_desde - b.hora_desde
  )
  const tramos: Tramo[] = []
  for (const m of ordenados) {
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && ultimo.dia === m.dia_semana && ultimo.hasta === m.hora_desde) {
      ultimo.hasta = m.hora_hasta
    } else {
      tramos.push({ dia: m.dia_semana, desde: m.hora_desde, hasta: m.hora_hasta })
    }
  }
  const horarios = tramos
    .map(t => `${LABEL[t.dia] ?? t.dia} ${formatHora(t.desde)}–${formatHora(t.hasta)}`)
    .join(", ")
  const cuenta: Record<string, number> = {}
  for (const m of ordenados) cuenta[m.dia_semana] = (cuenta[m.dia_semana] || 0) + 1
  const dias = ORDEN.filter(d => cuenta[d])
    .map(d => `${LABEL[d]} (${cuenta[d]})`)
    .join(", ")
  return (
    <div>
      <div>{horarios}</div>
      <div style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-hint)" }}>{dias}</div>
    </div>
  )
}
