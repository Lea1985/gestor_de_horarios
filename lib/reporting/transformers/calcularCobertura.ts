export type CoberturaEstado =
  | "NORMAL"
  | "REEMPLAZADA"
  | "SIN_COBERTURA"
  | "SUSPENDIDA"

export type ResumenCobertura = {

  total: number

  normales: number

  reemplazadas: number

  sinCobertura: number

  suspendidas: number

  coberturaPorcentaje: number
}

export function calcularCobertura(
  clases: Array<{
    coberturaEstado: CoberturaEstado
  }>
): ResumenCobertura {

  const resumen: ResumenCobertura = {

    total: clases.length,

    normales: 0,

    reemplazadas: 0,

    sinCobertura: 0,

    suspendidas: 0,

    coberturaPorcentaje: 0,
  }

  for (const clase of clases) {

    switch (clase.coberturaEstado) {

      case "NORMAL":
        resumen.normales++
        break

      case "REEMPLAZADA":
        resumen.reemplazadas++
        break

      case "SIN_COBERTURA":
        resumen.sinCobertura++
        break

      case "SUSPENDIDA":
        resumen.suspendidas++
        break
    }
  }

  const cubiertas =
    resumen.normales +
    resumen.reemplazadas

  resumen.coberturaPorcentaje =
    resumen.total > 0
      ? Math.round(
          (cubiertas / resumen.total) * 100
        )
      : 0

  return resumen
}