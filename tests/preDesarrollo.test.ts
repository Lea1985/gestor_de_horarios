import { describe, it, expect, afterAll } from "vitest"
import { execSync } from "child_process"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim()
  } catch (error: any) {
    throw new Error(error?.stdout || error?.message || "Error ejecutando comando")
  }
}

describe("Infraestructura (Docker + PostgreSQL)", () => {
  it("Docker debería estar corriendo", () => {
    const output = runCommand(
      'docker ps --format "table {{.Names}}\\t{{.Status}}"'
    ).toLowerCase()

    console.log("\n📄 Docker containers:\n", output)

    expect(output).toContain("up")
  })

  it("PostgreSQL debería responder consultas", async () => {
    const result: any = await prisma.$queryRaw`SELECT NOW() as now`

    console.log("\n📄 PostgreSQL response:\n", result)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].now).toBeDefined()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })
})