export function titularVigenteEn(
  titularidades: { fecha_desde: string; fecha_hasta: string | null; agente: { nombre: string; apellido: string; documento?: string } }[] | undefined,
  fecha: string | undefined
) {
  if (!titularidades?.length || !fecha) return null
  const f = new Date(fecha)
  const vigente = titularidades.find(t => {
    const desde = new Date(t.fecha_desde)
    const hasta = t.fecha_hasta ? new Date(t.fecha_hasta) : null
    return desde <= f && (!hasta || hasta >= f)
  })
  return vigente?.agente ?? null
}