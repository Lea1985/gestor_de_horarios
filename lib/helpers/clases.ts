//lib/helpers/clases.ts
import { EstadoClase, Dias, Causa } from "@prisma/client"

const DIA_JS: Record<Dias, number> = {
  LUNES:     1,
  MARTES:    2,
  MIERCOLES: 3,
  JUEVES:    4,
  VIERNES:   5,
  SABADO:    6,
  DOMINGO:   0,
}

type ModuloConDia = {
  id:         number
  dia_semana: Dias
}

type DiaSuspendido = {
  fecha: Date
}

type ClaseACrear = {
  institucionId: number
  asignacionId:  number
  moduloId:      number | null
  unidadId:      number
  comisionId:    number | null
  incidenciaId:  number | null
  fecha:         Date
  estado:        EstadoClase
  causa:         Causa
}

export function generarClases(params: {
  institucionId:        number
  asignacionId:         number
  unidadId:             number
  comisionId:           number | null
  incidenciaId:         number | null
  modulos:              ModuloConDia[]
  desde:                Date
  hasta:                Date
  diasSuspendidos:      DiaSuspendido[]
}): ClaseACrear[] {
  const { institucionId, asignacionId, unidadId, comisionId, incidenciaId, modulos, desde, hasta, diasSuspendidos } = params

  const fechasSuspendidas = new Set(
    diasSuspendidos.map(d => d.fecha.toISOString().slice(0, 10))
  )

  const clases: ClaseACrear[] = []
  const cursor = new Date(desde)
  cursor.setUTCHours(0, 0, 0, 0)
  const fin = new Date(hasta)
  fin.setUTCHours(23, 59, 59, 999)

  // modo turno (sin comision): una clase por día, sin moduloId
  if (comisionId === null) {
    // obtener días únicos de los módulos — o si no hay módulos, todos los días hábiles
    const diasUnicos = modulos.length > 0
      ? [...new Set(modulos.map(m => DIA_JS[m.dia_semana]))]
      : [1, 2, 3, 4, 5] // lunes a viernes por defecto

    while (cursor <= fin) {
      const diaSemana = cursor.getDay()
      if (diasUnicos.includes(diaSemana)) {
        const fechaStr = cursor.toISOString().slice(0, 10)
        const suspendida = fechasSuspendidas.has(fechaStr)
        clases.push({
          institucionId,
          asignacionId,
          moduloId:  null,
          unidadId,
          comisionId: null,
          incidenciaId,
          fecha:  new Date(cursor),
          estado: suspendida ? EstadoClase.SUSPENDIDA : EstadoClase.PROGRAMADA,
          causa:  suspendida ? Causa.CALENDARIO_ESCOLAR : Causa.NINGUNA,
        })
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return clases
  }

  // modo escolar (con comision): una clase por módulo por fecha correspondiente
  while (cursor <= fin) {
    const diaSemana = cursor.getDay()
    for (const modulo of modulos) {
      if (DIA_JS[modulo.dia_semana] === diaSemana) {
        const fechaStr = cursor.toISOString().slice(0, 10)
        const suspendida = fechasSuspendidas.has(fechaStr)
        clases.push({
          institucionId,
          asignacionId,
          moduloId:  modulo.id,
          unidadId,
          comisionId,
          incidenciaId,
          fecha:  new Date(cursor),
          estado: suspendida ? EstadoClase.SUSPENDIDA : EstadoClase.PROGRAMADA,
          causa:  suspendida ? Causa.CALENDARIO_ESCOLAR : Causa.NINGUNA,
        })
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return clases
}