import fs from "fs"
import path from "path"

const repoDir = path.resolve(process.cwd(), "lib/repositories")

const files = fs
  .readdirSync(repoDir)
  .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
  .sort()

const GLOBAL_REPOS = new Set([
  "authRepository.ts",
  "institucionRepository.ts",
])

const OP_REGEX =
  /\.(findUnique|findFirst|findMany|create|update|updateMany|delete|deleteMany|count)\s*\(/g

const findings: any[] = []

function extractBalancedBlock(source: string, startIndex: number) {
  const firstBrace = source.indexOf("{", startIndex)
  if (firstBrace === -1) return ""

  let depth = 0

  for (let i = firstBrace; i < source.length; i++) {
    if (source[i] === "{") depth++
    if (source[i] === "}") depth--

    if (depth === 0) {
      return source.slice(startIndex, i + 1)
    }
  }

  return source.slice(startIndex)
}

function findMethod(source: string, index: number) {
  const before = source.slice(0, index)

  const methodRegex = /([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/g
  const matches = [...before.matchAll(methodRegex)]

  if (!matches.length) {
    return {
      name: "desconocido",
      params: "",
      body: "",
    }
  }

  const last = matches[matches.length - 1]
  const methodStart = last.index ?? 0

  return {
    name: last[1],
    params: last[0],
    body: source.slice(methodStart, index),
  }
}

function riskLevel(operation: string) {
  if (["update", "delete", "updateMany", "deleteMany"].includes(operation)) {
    return { level: "ALTO", score: 7 }
  }

  if (["findUnique", "findFirst"].includes(operation)) {
    return { level: "MEDIO", score: 4 }
  }

  return { level: "BAJO", score: 2 }
}

function hasTenantSignal(block: string) {
  return (
    /institucionId\s*:/.test(block) ||
    /clase\s*:\s*\{\s*institucionId/.test(block) ||
    /asignacion\s*:\s*\{\s*institucionId/.test(block) ||
    /codigario\s*:\s*\{\s*institucionId/.test(block) ||
    /agenteId_institucionId/.test(block) ||
    /withTenant\s*\(/.test(block)
  )
}

function hasSafeTenantIdentity(block: string) {
  return /where\s*:\s*\{\s*id\s*:\s*tenantId/.test(block)
}

function hasOwnershipSignal(block: string) {
  return (
    /asignacionId\s*:/.test(block) ||
    /claseId\s*:/.test(block) ||
    /distribucionHorariaId\s*:/.test(block)
  )
}

function mutatesByPlainId(block: string, operation: string) {
  if (!["update", "delete"].includes(operation)) return false
  return /where\s*:\s*\{\s*id\s*:/.test(block)
}

/**
 * Detecta ownership previo en el método.
 *
 * Casos típicos:
 *
 * const existente = await repo.existeEnTenant(id, tenantId)
 * update({ where: { id: existente.id } })
 */
function hasPriorOwnershipCheck(methodBody: string, block: string) {
  const idFromExisting =
    /where\s*:\s*\{\s*id\s*:\s*existente\.id/.test(block) ||
    /where\s*:\s*\{\s*id\s*:\s*\w+\.id/.test(block)

  if (!idFromExisting) return false

  return (
    /existeEnTenant\s*\(/.test(methodBody) ||
    /obtenerPorId\s*\(/.test(methodBody) ||
    /findFirst\s*\(/.test(methodBody)
  )
}

for (const file of files) {
  if (GLOBAL_REPOS.has(file)) continue

  const source = fs.readFileSync(path.join(repoDir, file), "utf8")

  let match: RegExpExecArray | null

  while ((match = OP_REGEX.exec(source)) !== null) {
    const operation = match[1]
    const index = match.index

    const block = extractBalancedBlock(source, index)
    const method = findMethod(source, index)

    const receivesTenant =
      /tenantId/.test(method.params) ||
      /tenantId/.test(method.body)

    const tenantSignal = hasTenantSignal(block)
    const safeTenantIdentity = hasSafeTenantIdentity(block)
    const ownershipSignal = hasOwnershipSignal(block)
    const priorOwnership = hasPriorOwnershipCheck(method.body, block)

    if (safeTenantIdentity) continue

    /**
     * updateMany/deleteMany con withTenant
     */
    if (
      ["updateMany", "deleteMany"].includes(operation) &&
      tenantSignal
    ) {
      continue
    }

    /**
     * Mutadores sin tenant
     */
    if (
      !receivesTenant &&
      ["update", "delete", "updateMany", "deleteMany"].includes(operation)
    ) {
      findings.push({
        file,
        method: method.name,
        operation,
        level: "ALTO",
        score: 10,
        reason: "método mutador no recibe tenantId",
        snippet: block.slice(0, 260),
      })
      continue
    }

    /**
     * Mutación por id simple
     */
    if (mutatesByPlainId(block, operation) && receivesTenant && !tenantSignal) {
      if (priorOwnership) {
        continue
      }

      findings.push({
        file,
        method: method.name,
        operation,
        level: "ALTO",
        score: ownershipSignal ? 4 : 7,
        reason: ownershipSignal
          ? "mutación por id simple — ownership parcial"
          : "mutación por id simple — verificar ownership previo",
        snippet: block.slice(0, 260),
      })
      continue
    }

    /**
     * findFirst/findUnique sin tenant
     */
    if (
      ["findFirst", "findUnique"].includes(operation) &&
      !tenantSignal &&
      !safeTenantIdentity
    ) {
      if (ownershipSignal && receivesTenant) {
        continue
      }

      const risk = riskLevel(operation)

      findings.push({
        file,
        method: method.name,
        operation,
        level: risk.level,
        score: risk.score,
        reason: "query sin filtro tenant",
        snippet: block.slice(0, 260),
      })
    }
  }
}

const ranking: Record<string, any> = {}

for (const f of findings) {
  if (!ranking[f.file]) {
    ranking[f.file] = {
      file: f.file,
      score: 0,
      total: 0,
    }
  }

  ranking[f.file].score += f.score
  ranking[f.file].total += 1
}

const rankingList = Object.values(ranking).sort(
  (a: any, b: any) => b.score - a.score
)

console.log("")
console.log("=== Ranking real de riesgo multi-tenant ===")
console.log("")

rankingList.forEach((r: any, i: number) => {
  console.log(`${i + 1}. ${r.file} | score=${r.score} | hallazgos=${r.total}`)
})

console.log("")
console.log("=== Detalle ===")

for (const repo of rankingList) {
  console.log(`\n${repo.file}`)

  findings
    .filter((f) => f.file === repo.file)
    .forEach((f) => {
      console.log(`  ${f.level} | ${f.method}() | ${f.operation}`)
      console.log(`  motivo: ${f.reason}`)
      console.log(`  ${f.snippet.replace(/\n/g, "\n  ")}`)
      console.log("  --------------------------------------------------")
    })
}