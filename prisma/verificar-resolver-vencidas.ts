// prisma/verificar-resolver-vencidas.ts
import prisma from "../lib/prisma"
import { resolverClasesVencidas } from "../lib/usecases/clases/resolverClasesVencidas"

async function main() {
  const escuela = await prisma.institucion.findUniqueOrThrow({
    where: { dominio: "escuela12.edu.ar" },
  })
  const resultado = await resolverClasesVencidas(escuela.id)
  console.log("Resultado:", resultado)
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())