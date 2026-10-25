/**
 * impacto-motor.ts
 *
 * SOLO LECTURA. Mide cuántas ClaseProgramada cambiarían de estado/causa si
 * se volvieran a resolver con el motor actual (resolverEstadoYCausa +
 * obtenerCondicionesVigentes), comparando contra lo guardado. No llama a
 * resolverClase (que escribe) ni escribe nada: la sesión se abre con
 * default_transaction_read_only=on y el script aborta si no puede
 * comprobarlo con SHOW transaction_read_only.
 *
 * Ver scripts/README-impacto-motor.md para cómo correrlo.
 */

const BASES_PERMITIDAS = ["alnext_ceferino", "gestor_test"]
// connection_limit=1: una sola conexión en el pool, la misma sobre la que se
// verifica el modo solo lectura.
const PARAMETROS =
  "schema=public&options=-c%20default_transaction_read_only%3Don&connection_limit=1"
const EJEMPLOS_POR_TRANSICION = 20

function fallar(mensaje: string): never {
  console.error(`Abortado: ${mensaje}`)
  process.exit(1)
}

// Nunca muestra la URL: solo el nombre de la base.
function armarUrl(): { url: string; base: string } {
  const cruda = process.env.IMPACTO_DATABASE_URL
  if (!cruda) fallar("falta IMPACTO_DATABASE_URL (postgresql://usuario:clave@host:puerto/base)")
  let u: URL
  try {
    u = new URL(cruda)
  } catch {
    fallar("IMPACTO_DATABASE_URL ilegible")
  }
  const base = decodeURIComponent(u.pathname.replace(/^\//, ""))
  if (!BASES_PERMITIDAS.includes(base)) {
    fallar(`base "${base}" no permitida (solo ${BASES_PERMITIDAS.join(", ")})`)
  }
  u.search = ""
  return { url: `${u.toString()}?${PARAMETROS}`, base }
}

const sinUrl = (texto: string) => texto.replace(/postgres(ql)?:\/\/\S+/g, "<url>")

type Fila = {
  id: number
  institucionId: number
  asignacionId: number
  fecha: Date
  moduloId: number | null
  estado: string
  causa: string
}

type Grupo = {
  conteos: Map<string, number>
  ejemplos: Map<string, Fila[]>
}

const nuevoGrupo = (): Grupo => ({ conteos: new Map(), ejemplos: new Map() })

function imprimirGrupo(titulo: string, grupo: Grupo, total: number) {
  console.log(`\n== ${titulo} (${total} clases)`)
  const filas = [...grupo.conteos.entries()].sort((a, b) => b[1] - a[1])
  for (const [transicion, n] of filas) {
    const [antes, despues] = transicion.split(" -> ")
    const marca = antes === despues ? "  (sin cambio)" : ""
    console.log(`  ${String(n).padStart(6)}  ${transicion}${marca}`)
  }
  for (const [transicion, ejemplos] of grupo.ejemplos) {
    const n = grupo.conteos.get(transicion) ?? 0
    console.log(`\n  ${transicion}: ${n} clases, ${ejemplos.length} ejemplos`)
    for (const c of ejemplos) {
      console.log(
        `    clase=${c.id}  asignacion=${c.asignacionId}  ` +
        `fecha=${c.fecha.toISOString().slice(0, 10)}  modulo=${c.moduloId ?? "jornal"}`
      )
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === "test") {
    fallar("NODE_ENV=test: lib/prisma.ts cargaría .env.test en lugar de la base pedida")
  }
  const { url, base } = armarUrl()
  process.env.DATABASE_URL = url

  // lib/prisma.ts imprime la URL completa al cargarse (#281): se descarta esa
  // línea mientras se importa.
  const logOriginal = console.log
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("DB USADA")) return
    logOriginal(...args)
  }
  const { default: prisma } = await import("@/lib/prisma")
  const { obtenerCondicionesVigentes, resolverEstadoYCausa } =
    await import("@/lib/services/resolucionClaseService")
  const { hoyLocalISO } = await import("@/lib/helpers/fechaInstitucion")
  console.log = logOriginal

  try {
    const [modo] = await prisma.$queryRaw<{ transaction_read_only: string }[]>`SHOW transaction_read_only`
    if (modo?.transaction_read_only !== "on") {
      fallar(`la sesión no es de solo lectura (transaction_read_only=${modo?.transaction_read_only ?? "?"})`)
    }

    const ahora = new Date()
    console.log(`Base: ${base}  |  sesión solo lectura: on`)
    console.log(`Referencia: ${ahora.toISOString()} (hoy local ${hoyLocalISO(ahora)})`)

    const clases: Fila[] = await prisma.claseProgramada.findMany({
      select: {
        id: true, institucionId: true, asignacionId: true,
        fecha: true, moduloId: true, estado: true, causa: true,
      },
      orderBy: { id: "asc" },
    })

    const noDictadas = nuevoGrupo()
    const dictadas = nuevoGrupo()
    let totalNoDictadas = 0
    let totalDictadas = 0
    let cambian = 0

    for (const c of clases) {
      const condiciones = await obtenerCondicionesVigentes(c.id, c.institucionId)
      const nuevo = resolverEstadoYCausa(condiciones)
      const antes = `${c.estado}/${c.causa}`
      const despues = `${nuevo.estado}/${nuevo.causa}`
      const transicion = `${antes} -> ${despues}`

      const grupo = c.estado === "DICTADA" ? dictadas : noDictadas
      if (c.estado === "DICTADA") totalDictadas++
      else totalNoDictadas++
      grupo.conteos.set(transicion, (grupo.conteos.get(transicion) ?? 0) + 1)

      if (antes !== despues) {
        cambian++
        const lista = grupo.ejemplos.get(transicion) ?? []
        if (lista.length < EJEMPLOS_POR_TRANSICION) lista.push(c)
        grupo.ejemplos.set(transicion, lista)
      }
    }

    console.log(`Clases evaluadas: ${clases.length}  |  cambiarían estado/causa: ${cambian}`)
    imprimirGrupo("No DICTADA", noDictadas, totalNoDictadas)
    imprimirGrupo("DICTADA", dictadas, totalDictadas)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  fallar(sinUrl(error instanceof Error ? error.message : String(error)))
})
