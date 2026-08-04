// prisma/verificar-fix-incidencia-dictada.ts
import prisma from "../lib/prisma"
import { resolverClasesIncidencia } from "../lib/usecases/incidencias/resolverClasesIncidencia"

async function main() {
  const escuela = await prisma.institucion.findUniqueOrThrow({
    where: { dominio: "escuela12.edu.ar" },
  })
  const resultado = await resolverClasesIncidencia(5, escuela.id)
  console.log("Resultado:", resultado)
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())