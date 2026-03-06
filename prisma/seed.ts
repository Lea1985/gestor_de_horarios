import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {

  const institucion = await prisma.institucion.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombre: "Institución Demo",
      configuracion: {
        duracionModulo: 40
      }
    }
  })

  console.log("Institución creada:", institucion)

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())