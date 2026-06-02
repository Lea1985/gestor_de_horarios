// lib/reporting/transformers/agruparReemplazosPorSuplente.ts

export type ReemplazoConSuplente = {
  agenteSuplente: {
    nombre: string
    apellido: string
    documento: string
  } | null
}

export function agruparReemplazosPorSuplente(reemplazos: ReemplazoConSuplente[]) {
  const porSuplente: Record<
    number,
    {
      agente: { nombre: string; apellido: string; documento: string }
      cantidad: number
    }
  > = {}

  for (const r of reemplazos) {
    if (!r.agenteSuplente) continue
    const id = Number(r.agenteSuplente.documento)
    if (!porSuplente[id]) {
      porSuplente[id] = {
        agente: r.agenteSuplente,
        cantidad: 0,
      }
    }
    porSuplente[id].cantidad++
  }

  return Object.values(porSuplente).sort((a, b) => b.cantidad - a.cantidad)
}