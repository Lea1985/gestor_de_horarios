import { describe, it, expect } from "vitest"
import { execSync } from "child_process"

describe("Entorno de desarrollo", () => {
  it("debería tener Node.js instalado", () => {
    const version = execSync("node -v", { encoding: "utf8" }).trim()
    expect(version).toMatch(/^v\d+/)
  })

  it("debería tener npm instalado", () => {
    const version = execSync("npm -v", { encoding: "utf8" }).trim()
    expect(version).toMatch(/^\d+/)
  })

  it("debería tener Docker instalado", () => {
    const version = execSync("docker --version", { encoding: "utf8" }).trim()
    expect(version.toLowerCase()).toContain("docker")
  })
})