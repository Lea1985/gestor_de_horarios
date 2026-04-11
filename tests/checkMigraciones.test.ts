import { describe, it, expect } from "vitest"
import { execSync } from "child_process"

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim()
  } catch (error: any) {
    throw new Error(error?.stdout || error?.message || "Error ejecutando comando")
  }
}

describe("Prisma migrations", () => {
  it("no debería tener migraciones pendientes ni drift", () => {
    const output = runCommand("npx prisma migrate status").toLowerCase()

    // Debug útil si algo falla
    console.log("\n📄 Prisma status:\n", output)

    expect(output).not.toContain("pending")
    expect(output).not.toContain("drift")
    expect(output).toMatch(/up to date|no pending migrations/)
  })

  it("debería poder aplicar migraciones sin errores", () => {
    expect(() => {
      runCommand("npx prisma migrate deploy")
    }).not.toThrow()
  })
})