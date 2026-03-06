import { prisma } from '@/lib/prisma'

export async function getPersonasByTenant(institucionId: number) {

  return prisma.persona.findMany({
    where: {
      institucionId
    }
  })

}

export async function createPersona(institucionId: number, data:any) {

  return prisma.persona.create({
    data: {
      ...data,
      institucionId
    }
  })

}