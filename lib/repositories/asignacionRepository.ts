// lib/repositories/asignacionRepository.ts

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Incluye el titular vigente como subconsulta anidada.
// "Vigente" = activo: true, fecha_hasta: null.
// Un cargo vacante devuelve titularVigente: null.
const includeBase = {
  unidad: true,
 materia: {
  select: {
    id: true,
    nombre: true,
    cursoId: true,
  },
},
  comision: true,
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

// Tipo helper para exponer el titular aplanado en capa de use case / API.
// El repositorio devuelve titularidades[0] | undefined; los use cases
// pueden aplanarlo antes de serializar si prefieren la forma { agente }.
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

  obtenerPorId(id: number, tenantId: number) {
    return prisma.asignacion.findFirst({
      where: {
        id,
        institucionId: tenantId,
        deletedAt: null,
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

  // Determina si la asignación tiene entidades relacionadas que restringen
  // la edición de campos estructurales.
  //
  // OJO:
  // TitularAsignacion NO bloquea edición.
  // Crear una asignación con agente genera inmediatamente una titularidad inicial,
  // y eso no debe considerarse "historial estructural".
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

  crear(data: {
    tenantId: number
    unidadId: number
    identificadorEstructural: string
    fecha_inicio: Date
    fecha_fin: Date | null
    materiaId?: number | null
    comisionId?: number | null
    turnoId: number
  }) {
    return prisma.asignacion.create({
      data: {
        institucionId: data.tenantId,
        unidadId: data.unidadId,
        identificadorEstructural: data.identificadorEstructural,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        materiaId: data.materiaId ?? null,
        comisionId: data.comisionId ?? null,
        turnoId: data.turnoId,
      },
      include: includeBase,
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

  // softDelete cierra además el titular vigente en la misma transacción,
  // evitando que queden TitularAsignacion abiertos apuntando a un cargo cesado.
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
      // Cerrar titular vigente si existe
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

      // Soft delete del cargo
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

  reactivar(id: number, tenantId: number) {
    return prisma.asignacion.update({
      where: { id },
      data: {
        activo: true,
        deletedAt: null,
        estado: "ACTIVO",
      },
    })
  },
}
