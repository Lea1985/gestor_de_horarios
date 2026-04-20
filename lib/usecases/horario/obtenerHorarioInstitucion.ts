// lib/usecases/horario/obtenerHorarioInstitucion.ts
import { horarioRepository, DIAS, DIA_INDEX, rangoDeSemana } from "@/lib/repositories/horarioRepository"

export class SemanaObligatoriaError extends Error {
  constructor() { super("El parámetro semana es obligatorio") }
}

export async function obtenerHorarioInstitucion(tenantId: number, semana: string | null | undefined) {
  if (!semana) throw new SemanaObligatoriaError()

  const { lunes, domingo } = rangoDeSemana(semana)
  const clases = await horarioRepository.listarSemanaInstitucion(tenantId, lunes, domingo)

  type Clase = (typeof clases)[0]

  const porUnidad: Record<string, { unidad: Clase["unidad"]; grilla: Record<string, Clase[]> }> = {}

  for (const clase of clases) {
    const key = String(clase.unidadId)
    if (!porUnidad[key]) {
      porUnidad[key] = {
        unidad: clase.unidad,
        grilla: DIAS.reduce((acc, d) => { acc[d] = []; return acc }, {} as Record<string, Clase[]>),
      }
    }
    const nombreDia = DIA_INDEX[new Date(clase.fecha).getUTCDay()]
    porUnidad[key].grilla[nombreDia].push(clase)
  }

  return {
    semana:   { lunes: lunes.toISOString(), domingo: domingo.toISOString() },
    total:    clases.length,
    unidades: Object.values(porUnidad),
  }
}