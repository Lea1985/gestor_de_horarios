// lib/repositories/agenteRepository.ts
import prisma from "@/lib/prisma"
import { Prisma, Estado } from "@prisma/client"

export const agenteSelect = {
  id:            true,
  institucionId: true,
  nombre:        true,
  apellido:      true,
  documento:     true,
  email:         true,
  telefono:      true,
  domicilio:     true,

  estado:        true,
  activo:        true,
  deletedAt:     true,

  createdAt:     true,
  updatedAt:     true,
}
export const agenteRepository = {

listar(tenantId: number, incluirInactivos = false) {
  return prisma.agente.findMany({
    where: {
      institucionId: tenantId,
      ...(incluirInactivos ? {} : { activo: true, deletedAt: null }),
    },
    select: agenteSelect,
    orderBy: incluirInactivos
      ? [{ activo: "desc" }, { apellido: "asc" }]
      : { apellido: "asc" },
  })
},

  obtenerPorId(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },
      select: agenteSelect,
    })
  },

  existeEnTenant(agenteId: number, tenantId: number) {
    return prisma.agente.findFirst({
      where: {
        id: agenteId,
        institucionId: tenantId,
        activo: true,
        deletedAt: null,
      },
      select: { id: true },
    })
  },
  existeEliminado(agenteId: number, tenantId: number) {
  return prisma.agente.findFirst({
    where: {
      id: agenteId,
      institucionId: tenantId,
      activo: false,  // solo busca inactivos
    },
    select: { id: true },
  })
},

  crear(data: {
    nombre:    string
    apellido:  string
    documento: string
    email:     string | null
    telefono:  string | null
    domicilio: string | null
    tenantId:  number
  }) {
    return prisma.agente.create({
      data: {
        institucionId: data.tenantId,
        nombre:        data.nombre,
        apellido:      data.apellido,
        documento:     data.documento,
        email:         data.email,
        telefono:      data.telefono,
        domicilio:     data.domicilio,
      },
      select: agenteSelect,
    })
  },

  actualizar(agenteId: number, tenantId: number, data: {
    nombre?:    string
    apellido?:  string
    documento?: string
    email?:     string
    telefono?:  string
    domicilio?: string
  }) {
    const dataAgente: Prisma.AgenteUpdateInput = {}

    if (data.nombre    !== undefined) dataAgente.nombre    = data.nombre
    if (data.apellido  !== undefined) dataAgente.apellido  = data.apellido
    if (data.email     !== undefined) dataAgente.email     = data.email
    if (data.telefono  !== undefined) dataAgente.telefono  = data.telefono
    if (data.domicilio !== undefined) dataAgente.domicilio = data.domicilio
    if (data.documento !== undefined) dataAgente.documento = data.documento

    return prisma.$transaction(async (tx) => {
      await tx.agente.updateMany({
        where: {
          id: agenteId,
          institucionId: tenantId,
        },
        data: dataAgente,
      })

      return tx.agente.findFirst({
        where: {
          id: agenteId,
          institucionId: tenantId,
          activo: true,
          deletedAt: null,
        },
        select: agenteSelect,
      })
    })
  },

  /**
   * Soft delete dentro del tenant
   */
eliminar(agenteId: number, tenantId: number) {
  return prisma.agente.updateMany({
    where: { id: agenteId, institucionId: tenantId },
    data: {
      activo: false,
      deletedAt: new Date(),
      estado: Estado.INACTIVO,
    },
  })
},




listarConInactivos(tenantId: number) {
  return prisma.agente.findMany({
    where: {
      institucionId: tenantId,
      // sin filtro → trae activos Y eliminados
    },
    select: agenteSelect,
    orderBy: [{ activo: "desc" }, { apellido: "asc" }],
  })
},

  reactivar(agenteId: number, tenantId: number) {
    return prisma.agente.updateMany({
      where: { id: agenteId, institucionId: tenantId },
      data: {
        activo:    true,
        deletedAt: null,
        estado:    Estado.ACTIVO,
      },
    })
  },
}