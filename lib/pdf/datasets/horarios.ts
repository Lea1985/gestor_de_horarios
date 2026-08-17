// lib/pdf/datasets/horarios.ts
import prisma from "@/lib/prisma"
export type HorarioComisionRow = {
  moduloId:    number
  dia:         string
  horaDesde:   number
  horaHasta:   number
  materia:     string | null
  identificador: string
  titularNombre: string
  titularDNI:    string
  aCargoNombre?: string
  aCargosDNI?:   string
  esSuplente?:   boolean
}
export type DatosReporteHorarios = {
  comision: {
    id:     number
    nombre: string
    curso:  string
    turno:  string
    unidad: string | null
  }
  filas: HorarioComisionRow[]
}
/**
 * Si se pasa comisionId, devuelve un array con un único elemento (esa
 * comisión). Si no, devuelve todas las comisiones activas de la
 * institución -- mismo patrón que obtenerDatosCodigarios.
 */
export async function obtenerDatosHorarios(
  tenantId:       number,
  comisionId:     number | null,
  conACargoAhora: boolean
): Promise<DatosReporteHorarios[]> {
  const comisiones = await prisma.comision.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
      ...(comisionId ? { id: comisionId } : {}),
    },
    orderBy: [{ curso: { nombre: "asc" } }, { nombre: "asc" }],
    select: {
      id:     true,
      nombre: true,
      curso:  { select: { nombre: true } },
      turno:  { select: { nombre: true } },
      unidad: { select: { nombre: true } },
    },
  })
  if (comisiones.length === 0) return []
  // UTC explícito, medianoche de hoy -- comparar contra new Date() en vez
  // de la medianoche de hoy hacía que una distribución vigente "hasta hoy"
  // dejara de aparecer a mitad del día (fix del 18/08/2026).
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setUTCDate(manana.getUTCDate() + 1)
  const ORDEN_DIAS: Record<string, number> = {
    LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4,
    VIERNES: 5, SABADO: 6, DOMINGO: 7,
  }
  const resultados = await Promise.all(
    comisiones.map(async (comision) => {
      const asignaciones = await prisma.asignacion.findMany({
        where: {
          institucionId: tenantId,
          comisionId:    comision.id,
          activo:        true,
          deletedAt:     null,
        },
        select: {
          id:                       true,
          identificadorEstructural: true,
          materia:   { select: { nombre: true } },
          titularidades: {
            where:   { activo: true, fecha_hasta: null },
            take:    1,
            select: {
              agente: { select: { nombre: true, apellido: true, documento: true } },
            },
          },
          distribuciones: {
            where: {
              activo:    true,
              deletedAt: null,
              OR: [
                { fecha_vigencia_hasta: null },
                { fecha_vigencia_hasta: { gte: hoy } },
              ],
            },
            orderBy: { version: "desc" },
            take:    1,
            select: {
              distribucionModulos: {
                select: {
                  moduloHorario: {
                    select: {
                      id:         true,
                      dia_semana: true,
                      hora_desde: true,
                      hora_hasta: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      let reemplazosHoy: Map<number, { nombre: string; apellido: string; documento: string }> = new Map()
      if (conACargoAhora) {
        const clasesHoy = await prisma.claseProgramada.findMany({
          where: {
            institucionId: tenantId,
            comisionId:    comision.id,
            fecha: { gte: hoy, lt: manana },
          },
          select: {
            moduloId: true,
            reemplazos: {
              where:  { activo: true },
              select: {
                agenteSuplente: {
                  select: { nombre: true, apellido: true, documento: true },
                },
              },
              take: 1,
            },
          },
        })
        for (const clase of clasesHoy) {
          const r = clase.reemplazos[0]
          if (clase.moduloId && r?.agenteSuplente) {
            reemplazosHoy.set(clase.moduloId, r.agenteSuplente)
          }
        }
      }
      const filas: HorarioComisionRow[] = []
      for (const asig of asignaciones) {
        const dist = asig.distribuciones[0]
        if (!dist) continue
        const titular = asig.titularidades[0]?.agente
        for (const dm of dist.distribucionModulos) {
          const mod = dm.moduloHorario
          const suplente = conACargoAhora ? reemplazosHoy.get(mod.id) : undefined
          filas.push({
            moduloId:       mod.id,
            dia:            mod.dia_semana,
            horaDesde:      mod.hora_desde,
            horaHasta:      mod.hora_hasta,
            materia:        asig.materia?.nombre ?? null,
            identificador:  asig.identificadorEstructural,
            titularNombre:  titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante",
            titularDNI:     titular?.documento ?? "-",
            aCargoNombre:   suplente ? `${suplente.apellido}, ${suplente.nombre}` : undefined,
            aCargosDNI:     suplente?.documento,
            esSuplente:     !!suplente,
          })
        }
      }
      filas.sort((a, b) => {
        const dA = ORDEN_DIAS[a.dia] ?? 9
        const dB = ORDEN_DIAS[b.dia] ?? 9
        if (dA !== dB) return dA - dB
        return a.horaDesde - b.horaDesde
      })
      return {
        comision: {
          id:     comision.id,
          nombre: comision.nombre,
          curso:  comision.curso.nombre,
          turno:  comision.turno.nombre,
          unidad: comision.unidad?.nombre ?? null,
        },
        filas,
      }
    })
  )
  return resultados
}