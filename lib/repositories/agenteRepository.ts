import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const agenteSelect = {
  id:        true,
  nombre:    true,
  apellido:  true,
  documento: true,
  email:     true,
  telefono:  true,
  domicilio: true,
  estado:    true,
  createdAt: true,
  updatedAt: true,
}

export const agenteRepository = {

  listar(tenantId: number) {
    return prisma.agenteInstitucion.findMany({
      where: {
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
      include: {
        agente: { select: agenteSelect },
      },
      orderBy: { agente: { apellido: "asc" } },
    })
  },

  obtenerPorId(agenteId: number, tenantId: number) {
    return prisma.agenteInstitucion.findFirst({
      where: {
        agenteId,
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
      include: {
        agente: { select: agenteSelect },
      },
    })
  },

  existeEnTenant(agenteId: number, tenantId: number) {
    return prisma.agenteInstitucion.findFirst({
      where: {
        agenteId,
        institucionId: tenantId,
        agente: { activo: true, deletedAt: null },
      },
      select: { agenteId: true },
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
    return prisma.$transaction(async (tx) => {
      const agente = await tx.agente.create({
        data: {
          nombre:    data.nombre,
          apellido:  data.apellido,
          documento: data.documento,
          email:     data.email,
          telefono:  data.telefono,
          domicilio: data.domicilio,
        },
        select: agenteSelect,
      })

      const agenteInstitucion = await tx.agenteInstitucion.create({
        data: {
          agenteId:      agente.id,
          institucionId: data.tenantId,
          documento:     data.documento,
        },
      })

      return { agente, agenteInstitucion }
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
    return prisma.$transaction(async (tx) => {
      const dataAgente: Prisma.AgenteUpdateInput = {}
      if (data.nombre    !== undefined) dataAgente.nombre    = data.nombre
      if (data.apellido  !== undefined) dataAgente.apellido  = data.apellido
      if (data.email     !== undefined) dataAgente.email     = data.email
      if (data.telefono  !== undefined) dataAgente.telefono  = data.telefono
      if (data.domicilio !== undefined) dataAgente.domicilio = data.domicilio
      if (data.documento !== undefined) dataAgente.documento = data.documento

      const agente = await tx.agente.update({
        where: { id: agenteId },
        data:  dataAgente,
        select: agenteSelect,
      })

      if (data.documento !== undefined) {
        await tx.agenteInstitucion.update({
          where: {
            agenteId_institucionId: { agenteId, institucionId: tenantId },
          },
          data: { documento: data.documento },
        })
      }

      return agente
    })
  },

  eliminar(agenteId: number) {
    return prisma.agente.update({
      where: { id: agenteId },
      data: {
        activo:    false,
        deletedAt: new Date(),
      },
    })
  },
}