import fs from "fs"
import path from "path"

const repoDir = path.resolve(process.cwd(), "lib/repositories")

const files = fs
  .readdirSync(repoDir)
  .filter((f) => f.endsWith(".ts"))
  .sort()

const operationRegex =
  /\.(findUnique|findFirst|findMany|create|update|updateMany|delete|deleteMany|count)\s*\(\s*\{[\s\S]*?\}\s*\)/g

const findings = []

const GLOBAL_REPOS = new Set([
  "authRepository.ts",
  "institucionRepository.ts",
])

const GLOBAL_MODELS = new Set([
  "agente",
  "usuario",
  "refreshToken",
  "passwordResetToken",
])

function riskLevel(operation) {
  if (["update", "delete", "updateMany", "deleteMany"].includes(operation)) {
    return { level: "ALTO", score: 10 }
  }

  if (["findUnique", "findFirst"].includes(operation)) {
    return { level: "MEDIO", score: 4 }
  }

  return { level: "BAJO", score: 1 }
}

function findMethod(source, index) {
  const before = source.slice(0, index)

  const regex =
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g

  const RESERVED = new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
  ])

  const matches = [...before.matchAll(regex)]
    .filter((m) => !RESERVED.has(m[1]))

  if (!matches.length) {
    return {
      name: "desconocido",
      params: "",
      start: 0,
    }
  }

  const last = matches[matches.length - 1]

  return {
    name: last[1],
    params: last[2],
    start: last.index,
  }
}

function getMethodBody(source, method, index) {
  return source.slice(method.start, index)
}

function hasTenantInMethod(method, methodBody) {
  return (
    /\btenantId\b/.test(method.params) ||
    /\btenantId\b/.test(methodBody)
  )
}

function blockHasTenantFilter(block, methodBody) {
  return (
    /\binstitucionId\s*:/.test(block) ||
    /\bwithTenant\s*\(/.test(block) ||
    /\bwhere\s*:\s*where\b/.test(block) ||
    /\bwhere\s*:\s*donde\b/.test(block) ||
    /\bwhere\s*:\s*filters?\b/.test(block) ||
    /\binstitucionId\b/.test(methodBody) ||
    /\bagenteInstitucion\b/.test(block) ||
    /\bcodigario\s*:\s*\{[\s\S]*?institucionId/.test(block)
  )
}

function isGlobalModel(block) {
  const m = block.match(/prisma\.([a-zA-Z0-9_]+)\./)
  if (!m) return false
  return GLOBAL_MODELS.has(m[1])
}

function isSimpleIdMutation(block) {
  return /\bwhere\s*:\s*\{\s*id\s*:/.test(block)
}

for (const file of files) {
  if (GLOBAL_REPOS.has(file)) continue

  const source = fs.readFileSync(path.join(repoDir, file), "utf8")

  let match

  while ((match = operationRegex.exec(source)) !== null) {
    const block = match[0]
    const index = match.index

    const opMatch = block.match(
      /\.(findUnique|findFirst|findMany|create|update|updateMany|delete|deleteMany|count)/
    )

    const operation = opMatch ? opMatch[1] : "unknown"

    const method = findMethod(source, index)
    const methodBody = getMethodBody(source, method, index)

    const receivesTenant = hasTenantInMethod(method, methodBody)
    const hasTenantFilter = blockHasTenantFilter(block, methodBody)

    const isMutator = ["update", "updateMany", "delete", "deleteMany"].includes(operation)

    /*
      1. Método mutador sin tenantId
    */
    if (isMutator && !receivesTenant) {
      findings.push({
        file,
        method: method.name,
        operation,
        level: "ALTO",
        score: 10,
        reason: "método mutador no recibe tenantId",
        snippet: block.slice(0, 220),
      })
      continue
    }

    /*
      2. Mutación por id simple
      (aunque reciba tenantId, es sospechoso)
    */
    if (
      isMutator &&
      receivesTenant &&
      isSimpleIdMutation(block) &&
      !hasTenantFilter
    ) {
      findings.push({
        file,
        method: method.name,
        operation,
        level: "ALTO",
        score: 7,
        reason: "mutación por id simple — verificar ownership previo",
        snippet: block.slice(0, 220),
      })
      continue
    }

    /*
      3. Queries sin tenant
    */
    if (
      !hasTenantFilter &&
      !isGlobalModel(block)
    ) {
      /*
        excepción típica:
        miInstitucionRepository.update({ where: { id: tenantId } })
      */
      if (/\bwhere\s*:\s*\{\s*id\s*:\s*tenantId\s*\}/.test(block)) {
        continue
      }

      /*
        create sobre modelo global permitido
      */
      if (operation === "create" && isGlobalModel(block)) {
        continue
      }

      const risk = riskLevel(operation)

      if (risk.score > 1) {
        findings.push({
          file,
          method: method.name,
          operation,
          level: risk.level,
          score: risk.score,
          reason: "query sin filtro tenant",
          snippet: block.slice(0, 220),
        })
      }
    }
  }
}

/*
  Ranking
*/
const ranking = {}

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

const rankingList = Object.values(ranking).sort((a, b) => b.score - a.score)

console.log("")
console.log("=== Ranking real de riesgo multi-tenant ===")
console.log("")

rankingList.forEach((r, i) => {
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