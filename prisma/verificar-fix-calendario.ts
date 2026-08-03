// prisma/verificar-fix-calendario.ts
import { PrismaClient } from "@prisma/client"
import { resolverClase } from "../lib/services/resolucionClaseService"

const prisma = new PrismaClient()

async function main() {
  const escuela = await prisma.institucion.findUniqueOrThrow({
    where: { dominio: "escuela12.edu.ar" },
  })

  for (const claseId of [3, 4, 5, 6]) {
    const r = await resolverClase(claseId, escuela.id)
    console.log(`Clase ${claseId}:`, r)
  }
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })