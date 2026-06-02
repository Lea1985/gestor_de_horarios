// lib/reporting/transformers/calcularResumenEstados.ts
export type ResumenEstadosClases = {
  total: number

  programadas: number

  dictadas: number

  suspendidas: number

  reemplazadas: number
}

export function calcularResumenEstados(
  clases: Array<{
    estado: string
  }>
): ResumenEstadosClases {

  const resumen: ResumenEstadosClases = {

    total: clases.length,

    programadas: 0,

    dictadas: 0,

    suspendidas: 0,

    reemplazadas: 0,
  }

  for (const clase of clases) {

    switch (clase.estado) {

      case "PROGRAMADA":
        resumen.programadas++
        break

      case "DICTADA":
        resumen.dictadas++
        break

      case "SUSPENDIDA":
        resumen.suspendidas++
        break

      case "REEMPLAZADA":
        resumen.reemplazadas++
        break
    }
  }

  return resumen
}