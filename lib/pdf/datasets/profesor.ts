// lib/pdf/datasets/profesor.ts
import prisma from "@/lib/prisma"

export type DatosReporteProfesor = {
  agente: {
    nombre:    string
    apellido:  string
    documento: string
    email:     string | null
    telefono:  string | null
    domicilio: string | null
  }
  asignaciones: {
    identificador:  string
    materia:        string | null
    comision:       string | null
    turno:          string
    unidad:         string
    distribuciones: {
      version: number
      vigente: boolean
      desde:   Date
      hasta:   Date | null
      modulos: string
    }[]
    incidencias: {
      id:         number
      fechaDesde: Date
      fechaHasta: Date
      codigo:     string
      nombre:     string
      observacion: string | null
    }[]
  }[]
  reemplazosComoSuplente: {
    fecha:         Date
    asignacion:    string
    titularNombre: string
    titularDNI:    string
  }[]
}

type Agente = { nombre: string; apellido: string; documento: string }

/**
 * Busca, dentro del historial de titularidades de una asignación, quién
 * era el titular vigente en una fecha puntual (no simplemente el más
 * reciente / actualmente activo).
 */
function titularVigenteEn(
  titularidades: { fecha_desde: Date; fecha_hasta: Date | null; agente: Agente | null }[],
  fecha: Date
): Agente | null {
  const vigente = titularidades.find(
    t => t.fecha_desde <= fecha && (!t.fecha_hasta || t.fecha_hasta >= fecha)
  )
  return vigente?.agente ?? null
}

export async function obtenerDatosProfesor(
  tenantId: number,
  agenteId: number
): Promise<DatosReporteProfesor | null> {
  const agente = await prisma.agente.findFirst({
    where: { id: agenteId, institucionId: tenantId, deletedAt: null },
    select: {
      nombre:    true,
      apellido:  true,
      documento: true,
      email:     true,
      telefono:  true,
      domicilio: true,
    },
  })
  if (!agente) return null

  const ORDEN_DIAS: Record<string, number> = {
    LUNES: 1, MARTES: 2, MIERCOLES: 3,
    JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7,
  }

  // Titularidades (históricas y vigentes) para obtener las asignaciones
  const titularidades = await prisma.titularAsignacion.findMany({
    where: { agenteId, institucionId: tenantId },
    select: { asignacionId: true },
    distinct: ["asignacionId"],
  })
  const asignacionIds = titularidades.map(t => t.asignacionId)

  const asignaciones = await prisma.asignacion.findMany({
    where: { id: { in: asignacionIds }, deletedAt: null },
    orderBy: { identificadorEstructural: "asc" },
    select: {
      identificadorEstructural: true,
      materia:  { select: { nombre: true } },
      comision: { select: { nombre: true } },
      turno:    { select: { nombre: true } },
      unidad:   { select: { nombre: true } },
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
      incidencias: {
        where:   { activo: true, deletedAt: null },
        orderBy: { fecha_desde: "desc" },
        select: {
          id:          true,
          fecha_desde: true,
          fecha_hasta: true,
          observacion: true,
          codigarioItem: { select: { codigo: true, nombre: true } },
        },
      },
    },
  })

  // Reemplazos como suplente -- se traen TODOS (activos e históricos), no
  // solo los que este agente sigue cubriendo hoy. Un reemplazo que ya
  // terminó (porque a este agente también lo reemplazaron después) sigue
  // siendo un hecho real que pasó, y el reporte del profesor debe
  // mostrarlo igual.
  const reemplazos = await prisma.reemplazo.findMany({
    where: {
      agenteSuplenteId: agenteId,
      clase: { institucionId: tenantId },
    },
    orderBy: { clase: { fecha: "desc" } },
    select: {
      clase: { select: { fecha: true } },
      asignacionTitular: {
        select: {
          identificadorEstructural: true,
          titularidades: {
            select: {
              fecha_desde: true,
              fecha_hasta: true,
              agente: { select: { nombre: true, apellido: true, documento: true } },
            },
          },
        },
      },
    },
  })

  return {
    agente,
    asignaciones: asignaciones.map(a => ({
      identificador: a.identificadorEstructural,
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
      incidencias: a.incidencias.map(i => ({
        id:          i.id,
        fechaDesde:  i.fecha_desde,
        fechaHasta:  i.fecha_hasta,
        codigo:      i.codigarioItem?.codigo ?? "-",
        nombre:      i.codigarioItem?.nombre ?? "-",
        observacion: i.observacion,
      })),
    })),
    reemplazosComoSuplente: reemplazos.map(r => {
      const titular = titularVigenteEn(r.asignacionTitular.titularidades, r.clase.fecha)
      return {
        fecha:         r.clase.fecha,
        asignacion:    r.asignacionTitular.identificadorEstructural,
        titularNombre: titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante",
        titularDNI:    titular?.documento ?? "-",
      }
    }),
  }
}