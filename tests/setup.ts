  // tests/setup.ts
  import dotenv from "dotenv"
  dotenv.config({ path: ".env.test" })

  import { beforeEach } from "vitest"
  import { asegurarBaseDeTest } from "./helpers/guardiaBaseTest"

  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ Tests solo en NODE_ENV=test")
  }

  // Antes de que cualquier archivo de test importe Prisma: aborta si
  // DATABASE_URL no apunta a gestor_test.
  asegurarBaseDeTest()

  beforeEach(async () => {
    // ❌ NO borrar todo globalmente
    // ✅ cada test limpia lo que crea
  })