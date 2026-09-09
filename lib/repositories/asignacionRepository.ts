// lib/repositories/asignacionRepository.ts
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
const includeBase = {
  unidad: true,
  materia: {
    select: {
      id: true,
      nombre: true,
      cursoId: true,
    },
  },
  comision: {
    include: { curso: true },
  },
  turno: true,
  titularidades: {
    where: {
      activo: true,
      fecha_hasta: null,
    },
    include: { agente: true },
    take: 1,
  },
}
export type AsignacionConTitular = Prisma.AsignacionGetPayload<{
  include: typeof includeBase
}>
export const asignacionRepository = {
  listar(tenantId: number, incluirInactivas = false) {
    return prisma.asignacion.findMany({
      where: {
        institucionId: tenantId,
        ...(incluirInactivas ? {} : { deletedAt: null }),
      },
      include: includeBase,
      orderBy: { createdAt: "desc" },
    })
  },
    // UX-INC-014: usado solo por el wizard de "Nueva incidencia" (paso 1) para
  // marcar qué asignaciones no van a poder recibir una incidencia porque no
  // tienen ninguna ClaseProgramada de hoy en adelante (sin distribución
  // vigente, distribución vencida, o cualquier otro motivo) — evita que el
  // usuario complete todo el formulario y recién en el paso 3 se entere de
  // "No hay clases programadas...". No se usa en el listado general de
  // Asignaciones a propósito, para no sumarle una consulta extra por fila
  // a una pantalla que no la necesita.
  listarParaIncidencia(tenantId: number) {
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    return prisma.asignacion.findMany({
      where: {
        institucionId: tenantId,
        deletedAt: null,
      },
      include: {
        ...includeBase,
        ClaseProgramada: {
          where: { fecha: { gte: hoy } },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })
  },
  obtenerPorId(id: number, tenantId: number, incluirEliminados = false) {
    return prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        ...(incluirEliminados ? {} : { deletedAt: null }),
      },
      include: {
        ...includeBase,
        distribuciones: true,
        incidencias: true,
        horariosAsignados: true,
        ClaseProgramada: true,
      },
    })
  },
  existeEnTenant(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  async tieneEntidadesRelacionadas(id: number): Promise<boolean> {
    const counts = await prisma.asignacion.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            distribuciones: true,
            incidencias: true,
            ClaseProgramada: true,
          },
        },
      },
    })
    if (!counts) return false
    const { distribuciones, incidencias, ClaseProgramada } = counts._count
    return (
      distribuciones > 0 ||
      incidencias > 0 ||
      ClaseProgramada > 0
    )
  },
  verificarIdentificador(identificador: string, tenantId: number, excludeId?: number) {
    return prisma.asignacion.findFirst({
      where: {
        identificadorEstructural: identificador,
        institucionId: tenantId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
  },
  async actualizar(
    id: number,
    tenantId: number,
    data: Prisma.AsignacionUpdateInput
  ) {
    const existente = await prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!existente) {
      throw new Error("Asignación no encontrada")
    }
    return prisma.asignacion.update({
      where: { id: existente.id },
      data,
      include: includeBase,
    })
  },
  async softDelete(id: number, tenantId: number) {
    const existente = await prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!existente) {
      throw new Error("Asignación no encontrada")
    }
    const ahora = new Date()
    return prisma.$transaction([
      prisma.titularAsignacion.updateMany({
        where: {
          asignacionId: id,
          fecha_hasta: null,
          activo: true,
        },
        data: {
          fecha_hasta: ahora,
          activo: false,
        },
      }),
      prisma.asignacion.update({
        where: { id: existente.id },
        data: {
          deletedAt: ahora,
          activo: false,
          estado: "INACTIVO",
        },
      }),
    ])
  },
  verificarAgente(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  verificarUnidad(unidadId: number, tenantId: number) {
    return prisma.unidadOrganizativa.findFirst({
      where: {
        id: unidadId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  verificarMateria(materiaId: number, tenantId: number) {
    return prisma.materia.findFirst({
      where: {
        id: materiaId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  verificarComision(comisionId: number, tenantId: number) {
    return prisma.comision.findFirst({
      where: {
        id: comisionId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        turnoId: true,
        unidadId: true,
      },
    })
  },
  verificarTurno(turnoId: number, tenantId: number) {
    return prisma.turno.findFirst({
      where: {
        id: turnoId,
        institucionId: tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  existeEliminada(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        activo: false,
      },
      select: { id: true },
    })
  },
  async reactivar(id: number, tenantId: number) {
    return prisma.$transaction(async (tx) => {
      await tx.asignacion.update({
        where: { id },
        data: {
          activo:    true,
          deletedAt: null,
          estado:    "ACTIVO",
        },
      })
      const ultimaTitularidad = await tx.titularAsignacion.findFirst({
        where: {
          asignacionId: id,
          activo:       false,
          fecha_hasta:  { not: null },
        },
        orderBy: { fecha_desde: "desc" },
      })
      if (ultimaTitularidad) {
        await tx.titularAsignacion.update({
          where: { id: ultimaTitularidad.id },
          data: {
            activo:      true,
            fecha_hasta: null,
          },
        })
      }
    })
  },
}