import { horarioRepository, DIAS, DIA_INDEX, rangoDeSemana } from "@/lib/repositories/horarioRepository"

export class SemanaObligatoriaError extends Error {
  constructor() { super("El parámetro semana es obligatorio") }
}

export class FiltroObligatorioError extends Error {
  constructor() { super("Se requiere al menos uno de: asignacionId, unidadId, comisionId") }
}

export async function obtenerHorarioSemana(tenantId: number, params: {
  semana?:       string | null
  asignacionId?: string | null
  unidadId?:     string | null
  comisionId?:   string | null
}) {
  const { semana, asignacionId, unidadId, comisionId } = params

  if (!semana) throw new SemanaObligatoriaError()
  if (!asignacionId && !unidadId && !comisionId) throw new FiltroObligatorioError()

  const { lunes, domingo } = rangoDeSemana(semana)

  const clases = await horarioRepository.listarSemana(tenantId, lunes, domingo, {
    asignacionId: asignacionId ? parseInt(asignacionId) : undefined,
    unidadId:     unidadId     ? parseInt(unidadId)     : undefined,
    comisionId:   comisionId   ? parseInt(comisionId)   : undefined,
  })

  const grilla = DIAS.reduce((acc, dia) => {
    acc[dia] = clases.filter(c => DIA_INDEX[new Date(c.fecha).getDay()] === dia)
    return acc
  }, {} as Record<string, typeof clases>)

  return {
    semana: { lunes: lunes.toISOString(), domingo: domingo.toISOString() },
    grilla,
  }
}