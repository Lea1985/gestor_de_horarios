import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const clase = await prisma.claseProgramada.findFirst({
    where: { fecha: new Date("2026-08-12T00:00:00.000Z") },
    include: {
      reemplazos: {
        include: {
          agenteSuplente: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  })
  console.log(JSON.stringify(clase, null, 2))
}

main().finally(() => prisma.$disconnect())
