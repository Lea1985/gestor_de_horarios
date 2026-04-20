import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const miInstitucionSelect = {
  id:            true,
  nombre:        true,
  dominio:       true,
  domicilio:     true,
  telefono:      true,
  email:         true,
  cuit:          true,
  estado:        true,
  configuracion: true,
  createdAt:     true,
}

export const miInstitucionRepository = {

  obtener(tenantId: number) {
    return prisma.institucion.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: miInstitucionSelect,
    })
  },

  actualizar(tenantId: number, data: Prisma.InstitucionUpdateInput) {
    return prisma.institucion.update({
      where: { id: tenantId },
      data,
      select: miInstitucionSelect,
    })
  },
}