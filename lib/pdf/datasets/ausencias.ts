// lib/pdf/datasets/ausencias.ts
import prisma from "@/lib/prisma"

export type FilaAusencia = {
  incidenciaId:      number
  incidenciaPadreId: number | null
  esRaiz:            boolean
  fechaDesde:        Date
  fechaHasta:        Date
  codigoArt:         string
  nombreArt:         string
  // Para incidencias raíz: el titular real del cargo.
  // Para incidencias hijas: el suplente saliente (a quien esta incidencia reemplaza).
  titularDNI:        string
  titularNombre:     string
  identificador:     string
  materia:           string | null
  comision:          string | null
  distribucion:      string   // resumen de módulos con conteo por día: "MAR (1) 11:10-11:45, MIE (2) 12:35-13:15, 14:00-14:45"
  // Reemplazo vigente (null si no hubo)
  reemplazante:      {
    nombre:    string
    documento: string
  } | null
}

const ORDEN_DIAS: Record<string, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3,
  JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7,
}

function formatHora(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
}

/**
 * Arma el resumen de distribución agrupando los módulos por día y
 * anteponiendo a cada día la cantidad de módulos que tiene.
 * Ej: "MAR (1) 11:10-11:45, MIE (2) 12:35-13:15, 14:00-14:45"
 */
function formatearDistribucion(
  modulos: { dia_semana: string; hora_desde: number; hora_hasta: number }[]
): string {
  const porDia = new Map<string, { dia_semana: string; hora_desde: number; hora_hasta: number }[]>()

  for (const m of modulos) {
    if (!porDia.has(m.dia_semana)) porDia.set(m.dia_semana, [])
    porDia.get(m.dia_semana)!.push(m)
  }

  const dias = [...porDia.keys()].sort(
    (a, b) => (ORDEN_DIAS[a] ?? 9) - (ORDEN_DIAS[b] ?? 9)
  )

  return dias
    .map(dia => {
      const modulosDia = porDia.get(dia)!.sort((a, b) => a.hora_desde - b.hora_desde)
      const horarios = modulosDia.map(m => `${formatHora(m.hora_desde)}-${formatHora(m.hora_hasta)}`).join(", ")
      return `${dia.slice(0, 3)} (${modulosDia.length}) ${horarios}`
    })
    .join(", ")
}

export async function obtenerDatosAusencias(
  tenantId:   number,
  filtros: {
    desde:      Date
    hasta:      Date
    comisionId?: number | null
    agenteId?:   number | null
  }
): Promise<FilaAusencia[]> {

  // Traer incidencias en el rango con sus datos
  const incidencias = await prisma.incidencia.findMany({
    where: {
      activo:     true,
      deletedAt:  null,
      fecha_desde: { lte: filtros.hasta },
      fecha_hasta: { gte: filtros.desde },
      asignacion: {
        institucionId: tenantId,
        activo:        true,
        deletedAt:     null,
        ...(filtros.comisionId ? { comisionId: filtros.comisionId } : {}),
        ...(filtros.agenteId   ? {
          titularidades: {
            some: {
              agenteId:   filtros.agenteId,
              activo:     true,
              fecha_hasta: null,
            },
          },
        } : {}),
      },
    },
    orderBy: [
      { fecha_desde: "asc" },
      { asignacionId: "asc" },
    ],
    select: {
      id:                true,
      asignacionId:      true,
      incidenciaPadreId: true,
      fecha_desde:       true,
      fecha_hasta:       true,
      codigarioItem: {
        select: { codigo: true, nombre: true },
      },
      asignacion: {
        select: {
          identificadorEstructural: true,
          materia:  { select: { nombre: true } },
          comision: { select: { nombre: true } },
          titularidades: {
            where:  { activo: true, fecha_hasta: null },
            take:   1,
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
                { fecha_vigencia_hasta: { gte: new Date() } },
              ],
            },
            orderBy: { version: "desc" },
            take:    1,
            select: {
              distribucionModulos: {
                select: {
                  moduloHorario: {
                    select: {
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
      },
    },
  })

  if (incidencias.length === 0) return []

  type Agente = { nombre: string; apellido: string; documento: string }

  // Para cada incidencia, buscar entre las ClaseProgramada de su rango
  // (mismo asignacionId) el reemplazo "saliente" (primer reemplazo
  // histórico, menor id) y el "entrante/vigente" (activo actual).
  // - Incidencia RAÍZ: el titular mostrado es el real (de asignacion.titularidades),
  //   y el reemplazante mostrado es el primer reemplazo histórico de la clase.
  // - Incidencia HIJA: el "titular" mostrado pasa a ser el suplente saliente
  //   (primer reemplazo histórico), y el reemplazante es el activo actual.
  const salienteHistorico = new Map<number, Agente>()
  const entranteActivo    = new Map<number, Agente>()

  await Promise.all(
    incidencias.map(async (inc) => {
      const clases = await prisma.claseProgramada.findMany({
        where: {
          institucionId: tenantId,
          asignacionId:  inc.asignacionId,
          fecha: { gte: inc.fecha_desde, lte: inc.fecha_hasta },
        },
        select: {
          reemplazos: {
            orderBy: { id: "asc" },
            select: {
              activo: true,
              agenteSuplente: {
                select: { nombre: true, apellido: true, documento: true },
              },
            },
          },
        },
      })

      for (const clase of clases) {
        if (clase.reemplazos.length === 0) continue

        const primero = clase.reemplazos[0]
        const activo  = clase.reemplazos.find(r => r.activo)

        if (primero?.agenteSuplente && !salienteHistorico.has(inc.id)) {
          salienteHistorico.set(inc.id, primero.agenteSuplente)
        }
        if (activo?.agenteSuplente && !entranteActivo.has(inc.id)) {
          entranteActivo.set(inc.id, activo.agenteSuplente)
        }
        break
      }
    })
  )

  const filas: FilaAusencia[] = incidencias.map(inc => {
    const esRaiz   = !inc.incidenciaPadreId
    const titular  = inc.asignacion.titularidades[0]?.agente
    const dist     = inc.asignacion.distribuciones[0]

    const modulos = dist?.distribucionModulos.map(dm => dm.moduloHorario) ?? []
    const distribucion = formatearDistribucion(modulos)

    let titularDNI:    string
    let titularNombre: string
    let reemplazante:  { nombre: string; documento: string } | null

    if (esRaiz) {
      titularDNI    = titular?.documento ?? "-"
      titularNombre = titular ? `${titular.apellido}, ${titular.nombre}` : "Vacante"
      const r = salienteHistorico.get(inc.id) ?? null
      reemplazante = r ? { nombre: `${r.apellido}, ${r.nombre}`, documento: r.documento } : null
    } else {
      const saliente = salienteHistorico.get(inc.id) ?? null
      titularDNI    = saliente?.documento ?? "-"
      titularNombre = saliente ? `${saliente.apellido}, ${saliente.nombre}` : "Sin datos"
      const entrante = entranteActivo.get(inc.id) ?? null
      reemplazante = entrante ? { nombre: `${entrante.apellido}, ${entrante.nombre}`, documento: entrante.documento } : null
    }

    return {
      incidenciaId:      inc.id,
      incidenciaPadreId: inc.incidenciaPadreId,
      esRaiz,
      fechaDesde:    inc.fecha_desde,
      fechaHasta:    inc.fecha_hasta,
      codigoArt:     inc.codigarioItem?.codigo ?? "-",
      nombreArt:     inc.codigarioItem?.nombre ?? "-",
      titularDNI,
      titularNombre,
      identificador: inc.asignacion.identificadorEstructural,
      materia:       inc.asignacion.materia?.nombre ?? null,
      comision:      inc.asignacion.comision?.nombre ?? null,
      distribucion,
      reemplazante,
    }
  })

  return filas
}
