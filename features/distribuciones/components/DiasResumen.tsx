// features/distribuciones/components/DiasResumen.tsx

import type { Distribucion } from "../types"

const LABEL: Record<string, string> = {
  LUNES:     "Lun",
  MARTES:    "Mar",
  MIERCOLES: "Mié",
  JUEVES:    "Jue",
  VIERNES:   "Vie",
  SABADO:    "Sáb",
  DOMINGO:   "Dom",
}

const ORDEN = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

type Props = {
  distribucion: Distribucion
}

export function DiasResumen({ distribucion }: Props) {
  if (distribucion.distribucionModulos.length === 0) return null

  const contadorDias = distribucion.distribucionModulos.reduce(
    (acc, dm) => {
      const dia = dm.moduloHorario.dia_semana
      acc[dia] = (acc[dia] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const texto = Object.entries(contadorDias)
    .sort(([a], [b]) => ORDEN.indexOf(a) - ORDEN.indexOf(b))
    .map(([dia, cantidad]) => `${LABEL[dia]} (${cantidad})`)
    .join(", ")

  return (
    <span style={{
      fontSize: "var(--text-2xs)",
      color: "var(--color-accent)",
      marginLeft: "var(--space-2)",
    }}>
      · {texto}
    </span>
  )
}