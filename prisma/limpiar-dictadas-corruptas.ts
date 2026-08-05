// prisma/limpiar-dictadas-corruptas.ts
import prisma from "../lib/prisma"
import { resolverClase } from "../lib/services/resolucionClaseService"

async function main() {
  const escuela = await prisma.institucion.findUniqueOrThrow({
    where: { dominio: "escuela12.edu.ar" },
  })
  for (const claseId of [5, 6, 9, 10]) {
    const r = await resolverClase(claseId, escuela.id)
    console.log(`Clase ${claseId}:`, r)
  }
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())