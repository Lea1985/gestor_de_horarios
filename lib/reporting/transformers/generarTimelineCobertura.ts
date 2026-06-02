import {
  ClaseOperativa,
} from "../datasets/obtenerClasesOperativas"

import {
  calcularCobertura,
} from "./calcularCobertura"

export type TimelineCoberturaItem = {

  fecha: string

  total: number

  normales: number

  reemplazadas: number

  sinCobertura: number

  suspendidas: number

  coberturaPorcentaje: number
}

export function generarTimelineCobertura(
  clases: ClaseOperativa[]
): TimelineCoberturaItem[] {

  const grupos = new Map<
    string,
    ClaseOperativa[]
  >()

  for (const clase of clases) {

    const fecha =
      clase.fecha
        .toISOString()
        .split("T")[0]

    if (!grupos.has(fecha)) {

      grupos.set(fecha, [])
    }

    grupos
      .get(fecha)!
      .push(clase)
  }

  return Array
    .from(grupos.entries())

    .sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    .map(([fecha, clasesDia]) => {

      const cobertura =
        calcularCobertura(clasesDia)

      return {

        fecha,

        total:
          cobertura.total,

        normales:
          cobertura.normales,

        reemplazadas:
          cobertura.reemplazadas,

        sinCobertura:
          cobertura.sinCobertura,

        suspendidas:
          cobertura.suspendidas,

        coberturaPorcentaje:
          cobertura.coberturaPorcentaje,
      }
    })
}