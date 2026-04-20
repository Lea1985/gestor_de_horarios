  // tests/setup.ts
  import dotenv from "dotenv"
  dotenv.config({ path: ".env.test" })

  import { beforeEach } from "vitest"

  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ Tests solo en NODE_ENV=test")
  }

  beforeEach(async () => {
    // ❌ NO borrar todo globalmente
    // ✅ cada test limpia lo que crea
  })