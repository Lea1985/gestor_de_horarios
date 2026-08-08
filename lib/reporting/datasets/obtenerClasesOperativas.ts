// lib/reporting/datasets/obtenerClasesOperativas.ts
import prisma from "@/lib/prisma"
import { CoberturaEstado } from "../transformers/calcularCobertura"

export type ClaseOperativa = {
  id: number
  fecha: Date
  estado: string
  coberturaEstado: CoberturaEstado
  unidad: {
    id: number
    nombre: string
  } | null
  comision: {
    id: number
    nombre: string
  } | null
  asignacion: {
    id: number
    identificadorEstructural: string
  } | null
  titular: {
    nombre: string
    apellido: string
  } | null
  incidencia: {
    id: number
    observacion: string | null
    articulo: string | null
  } | null
  reemplazoActivo: boolean
  suplente: {
    nombre: string
    apellido: string
  } | null
}

type Agente = { nombre: string; apellido: string }

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

/**
 * Trae las clases programadas de un rango de fechas con su estado de
 * cobertura calculado. Sirve tanto para el timeline (rango de varios días)
 * como para el resumen de "hoy" (rango de un solo día), evitando duplicar
 * la query en dos funciones distintas.
 */
export async function obtenerClasesOperativas(
  tenantId: number,
  desde: Date,
  hasta: Date
): Promise<ClaseOperativa[]> {
  const clases = await prisma.claseProgramada.findMany({
    where: {
      institucionId: tenantId,
      fecha: { gte: desde, lte: hasta },
    },
    orderBy: [{ fecha: "asc" }],
    include: {
      unidad: {
        select: { id: true, nombre: true },
      },
      comision: {
        select: { id: true, nombre: true },
      },
      asignacion: {
        select: {
          id: true,
          identificadorEstructural: true,
          titularidades: {
            select: {
              fecha_desde: true,
              fecha_hasta: true,
              agente: { select: { nombre: true, apellido: true } },
            },
          },
        },
      },
      incidencia: {
        select: {
          id: true,
          observacion: true,
          codigarioItem: { select: { codigo: true } },
        },
      },
      reemplazos: {
        where: { activo: true },
        select: {
          agenteSuplente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  })
  return clases.map(clase => {
    const titular   = clase.asignacion ? titularVigenteEn(clase.asignacion.titularidades, clase.fecha) : null
    const reemplazo = clase.reemplazos?.[0] ?? null
    const suplente  = reemplazo?.agenteSuplente ?? null
    const coberturaEstado: CoberturaEstado =
      clase.estado === "SUSPENDIDA"
        ? "SUSPENDIDA"
        : reemplazo
        ? "REEMPLAZADA"
        : clase.incidencia
        ? "SIN_COBERTURA"
        : "NORMAL"
    return {
      id:     clase.id,
      fecha:  clase.fecha,
      estado: clase.estado,
      coberturaEstado,
      unidad:   clase.unidad,
      comision: clase.comision,
      asignacion: clase.asignacion
        ? {
            id: clase.asignacion.id,
            identificadorEstructural: clase.asignacion.identificadorEstructural,
          }
        : null,
      titular,
      incidencia: clase.incidencia
        ? {
            id:          clase.incidencia.id,
            observacion: clase.incidencia.observacion,
            articulo:    clase.incidencia.codigarioItem?.codigo ?? null,
          }
        : null,
      reemplazoActivo: !!reemplazo,
      suplente,
    }
  })
}

/**
 * Atajo para obtener las clases operativas de hoy (rango de un solo día).
 */
export async function obtenerClasesOperativasHoy(
  tenantId: number
): Promise<ClaseOperativa[]> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  manana.setMilliseconds(manana.getMilliseconds() - 1)
  return obtenerClasesOperativas(tenantId, hoy, manana)
}