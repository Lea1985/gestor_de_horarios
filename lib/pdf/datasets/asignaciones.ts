// lib/pdf/datasets/asignaciones.ts
import prisma from "@/lib/prisma"

export type FilaAsignacion = {
  id:            number
  identificador: string
  titular:       string
  titularDNI:    string
  materia:       string | null
  comision:      string | null
  turno:         string
  unidad:        string
  distribuciones: {
    version:     number
    vigente:     boolean
    desde:       Date
    hasta:       Date | null
    modulos:     string
  }[]
}

export async function obtenerDatosAsignaciones(
  tenantId:   number,
  filtros: {
    comisionId?: number | null
    agenteId?:   number | null
  }
): Promise<FilaAsignacion[]> {

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      institucionId: tenantId,
      activo:        true,
      deletedAt:     null,
      ...(filtros.comisionId ? { comisionId: filtros.comisionId } : {}),
      ...(filtros.agenteId   ? {
        titularidades: {
          some: { agenteId: filtros.agenteId, activo: true, fecha_hasta: null },
        },
      } : {}),
    },
    orderBy: { identificadorEstructural: "asc" },
    select: {
      id:                       true,
      identificadorEstructural: true,
      materia:  { select: { nombre: true } },
      comision: { select: { nombre: true } },
      turno:    { select: { nombre: true } },
      unidad:   { select: { nombre: true } },
      titularidades: {
        where:  { activo: true, fecha_hasta: null },
        take:   1,
        select: {
          agente: { select: { nombre: true, apellido: true, documento: true } },
        },
      },
      distribuciones: {
        where:   { deletedAt: null },
        orderBy: { version: "desc" },
        select: {
          version:              true,
          estado:               true,
          fecha_vigencia_desde: true,
          fecha_vigencia_hasta: true,
          distribucionModulos: {
            select: {
              moduloHorario: {
                select: { dia_semana: true, hora_desde: true, hora_hasta: true },
              },
            },
          },
        },
      },
    },
  })

  const ORDEN_DIAS: Record<string, number> = {
    LUNES: 1, MARTES: 2, MIERCOLES: 3,
    JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7,
  }

  return asignaciones.map(a => {
    const titular = a.titularidades[0]?.agente
    return {
      id:            a.id,
      identificador: a.identificadorEstructural,
      titular:       titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante",
      titularDNI:    titular?.documento ?? "-",
      materia:       a.materia?.nombre ?? null,
      comision:      a.comision?.nombre ?? null,
      turno:         a.turno.nombre,
      unidad:        a.unidad.nombre,
      distribuciones: a.distribuciones.map(d => ({
        version: d.version,
        vigente: d.estado === "ACTIVO",
        desde:   d.fecha_vigencia_desde,
        hasta:   d.fecha_vigencia_hasta,
        modulos: d.distribucionModulos
          .sort((x, y) => (ORDEN_DIAS[x.moduloHorario.dia_semana] ?? 9) - (ORDEN_DIAS[y.moduloHorario.dia_semana] ?? 9))
          .map(dm => {
            const m = dm.moduloHorario
            const h = (min: number) => `${Math.floor(min/60).toString().padStart(2,"0")}:${(min%60).toString().padStart(2,"0")}`
            return `${m.dia_semana.slice(0,3)} ${h(m.hora_desde)}-${h(m.hora_hasta)}`
          })
          .join(", ") || "Sin módulos",
      })),
    }
  })
}