//lib/repositories/distribucionRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
function parseDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}
// UX-DIS-011/151: exportada -- se reusa desde eliminarDistribucion.ts y
// listarDistribuciones.ts/obtenerDistribucion.ts para el chequeo de
// incidencias solapadas con el tramo de una distribución puntual.
export function solapa(inicioA: Date, finA: Date, inicioB: Date, finB: Date) {
  return inicioA <= finB && finA >= inicioB
}
// Include completo para la lista — incluye agente, curso y turno
// que la page necesita para mostrar y filtrar
const asignacionInclude = {
  turno: true,
  unidad: true,
  materia: true,
  comision: {
    include: {
      curso: true,
      turno: true,
      unidad: true,
    },
  },
} satisfies Prisma.AsignacionInclude
export const distribucionRepository = {
listar(tenantId: number) {
  return prisma.distribucionHoraria.findMany({
    where: {
      institucionId: tenantId,
      deletedAt: null,
    },
    include: {
      asignacion: {
        include: asignacionInclude,
      },
      _count: {
        select: { distribucionModulos: true },
      },
      distribucionModulos: {
        include: {
          moduloHorario: {
            select: { dia_semana: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
},
  // UX-DIS-008: incluirEliminados permite que la pantalla de detalle
  // pueda cargar una distribución eliminada (para mostrar el badge
  // "Eliminada" + botón Reactivar), igual que asignacionRepository ya
  // hace para Asignaciones. El listado sigue sin usar este flag nunca.
  obtenerPorId(id: number, tenantId: number, incluirEliminados = false) {
    return prisma.distribucionHoraria.findFirst({
      where: {
        id,
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      include: {
        asignacion: {
          include: asignacionInclude,
        },
        distribucionModulos: {
          include: {
            moduloHorario: true,
          },
        },
      },
    })
  },
  existeEnTenant(id: number, tenantId: number) {
    return prisma.distribucionHoraria.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })
  },
  // UX-DIS-008: para reactivarDistribucion -- confirma que la distribución
  // existe Y está eliminada, y devuelve asignacionId + estado (el estado
  // hace falta para decidir si aplica la guarda de "ya existe una activa";
  // ver reactivarDistribucion.ts).
  existeEliminada(id: number, tenantId: number) {
    return prisma.distribucionHoraria.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: { not: null },
      },
      select: { id: true, asignacionId: true, estado: true },
    })
  },
  // UX-DIS-008: a propósito NO toca `estado` -- eliminar() tampoco lo
  // toca (deja lo que ya tenía la fila, ACTIVO o INACTIVO), así que
  // reactivar() solo revierte el soft-delete y deja el estado real como
  // estaba. Forzarlo a ACTIVO acá rompería el invariante de "una sola
  // versión ACTIVO por asignación" si mientras tanto se creó una versión
  // nueva (ver la guarda YaExisteActivaError en reactivarDistribucion.ts).
  async reactivar(id: number, tenantId: number) {
    return prisma.distribucionHoraria.update({
      where: { id },
      data: { activo: true, deletedAt: null },
    })
  },
  // UX-DIS-011/151: cierre automático por vencimiento de fecha, disparado
  // "por tráfico, sin cron" (mismo patrón que resolverClasesVencidas,
  // #15) -- se llama al principio de listar/obtener, nunca en background.
  async cerrarVencidas(tenantId: number) {
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    return prisma.distribucionHoraria.updateMany({
      where: {
        institucionId: tenantId,
        estado: "ACTIVO",
        deletedAt: null,
        fecha_vigencia_hasta: { lt: hoy },
      },
      data: { estado: "INACTIVO" },
    })
  },
  /**
   * Máxima versión usada por una asignación, A PROPÓSITO sin filtrar
   * deletedAt -- el índice único real de la DB (@@unique([asignacionId,
   * version])) no excluye borrados. Si acá filtráramos deletedAt: null
   * (como hace el resto del repository), podríamos proponer un número de
   * versión ya "quemado" por una versión eliminada y romper con un P2002
   * crudo al crear (bug encontrado 24/08/2026, #87).
   */
  async obtenerMaxVersion(tenantId: number, asignacionId: number): Promise<number> {
    const resultado = await prisma.distribucionHoraria.aggregate({
      where: { institucionId: tenantId, asignacionId },
      _max: { version: true },
    })
    return resultado._max.version ?? 0
  },
  async verificarSolapamiento(
    tenantId: number,
    asignacionId: number,
    version: number,
    desde: Date,
    hasta: Date
  ) {
    const versionNumber = typeof version === "number" ? version : Number(version)
    if (!Number.isInteger(versionNumber)) {
      throw new Error("version inválida")
    }
    const versionExistente = await prisma.distribucionHoraria.findFirst({
      where: {
        institucionId: tenantId,
        asignacionId,
        version: versionNumber,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (versionExistente) return { tipo: "version" as const }
    const existentes = await prisma.distribucionHoraria.findMany({
      where: {
        institucionId: tenantId,
        asignacionId,
        deletedAt: null,
      },
    })
    const conflicto = existentes.find((d) => {
      const dInicio = new Date(d.fecha_vigencia_desde)
      const dFin    = d.fecha_vigencia_hasta ?? new Date("9999-12-31")
      return solapa(desde, hasta, dInicio, dFin)
    })
    if (conflicto) return { tipo: "solapamiento" as const }
    return null
  },
  crear(data: {
    tenantId:             number
    asignacionId:         number
    version:              number
    fecha_vigencia_desde: Date
    fecha_vigencia_hasta: Date | null
  }) {
    return prisma.distribucionHoraria.create({
      data: {
        institucionId:        data.tenantId,
        asignacionId:         data.asignacionId,
        version:              Number(data.version),
        fecha_vigencia_desde: data.fecha_vigencia_desde,
        fecha_vigencia_hasta: data.fecha_vigencia_hasta,
      },
    })
  },
  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.DistribucionHorariaUpdateInput
  ) {
    const existente = await prisma.distribucionHoraria.findFirst({
      where: { id, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!existente) return null
    return prisma.distribucionHoraria.update({
      where: { id },
      data,
    })
  },
  async eliminar(id: number, tenantId: number) {
    const existente = await prisma.distribucionHoraria.findFirst({
      where: { id, institucionId: tenantId },
      select: { id: true, deletedAt: true },
    })
    if (!existente)          return { ok: true, deleted: false }
    if (existente.deletedAt) return { ok: true, deleted: false }
    await prisma.distribucionHoraria.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    })
    return { ok: true, deleted: true }
  },
  async asignarModulos(
    distribucionId: number,
    tenantId: number,
    modulos: number[]
  ) {
    const modulosUnicos = [...new Set(modulos.map(Number))]
    if (modulosUnicos.some(isNaN)) return null
    const distribucion = await prisma.distribucionHoraria.findFirst({
      where: { id: distribucionId, institucionId: tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!distribucion) return null
    if (modulosUnicos.length > 0) {
      const modulosValidos = await prisma.moduloHorario.findMany({
        where: {
          id: { in: modulosUnicos },
          institucionId: tenantId,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (modulosValidos.length !== modulosUnicos.length) return null
    }
    return prisma.$transaction(async (tx) => {
      await tx.distribucionModulo.deleteMany({
        where: { distribucionHorariaId: distribucionId },
      })
      if (modulosUnicos.length > 0) {
        await tx.distribucionModulo.createMany({
          data: modulosUnicos.map((moduloHorarioId) => ({
            distribucionHorariaId: distribucionId,
            moduloHorarioId,
          })),
        })
      }
      return tx.distribucionModulo.findMany({
        where: { distribucionHorariaId: distribucionId },
        include: { moduloHorario: true },
      })
    })
  },
  parseDate,
}