import { describe, it, expect } from "vitest"
import prisma from "@/lib/prisma"

describe("Prisma runtime safety", () => {
  it("debería estar conectado a la base de test", async () => {
    const db = await prisma.$queryRawUnsafe<
      { db: string }[]
    >(`SELECT current_database() as db`)

    expect(db[0].db).toBe("gestor_test")
  })

  it("NODE_ENV debe ser test", () => {
    expect(process.env.NODE_ENV).toBe("test")
  })
})