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
  // Las suspendidas (feriado, cambio de distribución, etc.) no cuentan en
  // el denominador -- no hubo nada que cubrir. Mismo criterio que
  // obtenerCoberturaAyer y calcularContinuidad en app/api/dashboard/overview/route.ts
  // y que obtenerCoberturaPorComision.ts.
  const denominador =
    resumen.total -
    resumen.suspendidas
  // Si el denominador da 0 (todas las clases del día están suspendidas, o
  // directamente no hay clases ese día), no hay nada que cubrir -- 100%,
  // no 0%. Antes devolvía 0, lo que mostraba "0% de cobertura" en un día
  // sin nada para cubrir (ej. un feriado institucional completo), algo
  // engañoso y además inconsistente con obtenerCoberturaPorComision.ts,
  // que ya usaba 100% en este mismo caso límite.
  resumen.coberturaPorcentaje =
    denominador > 0
      ? Math.round(
          (cubiertas / denominador) * 100
        )
      : 100

  return resumen
}