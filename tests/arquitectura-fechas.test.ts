// tests/arquitectura-fechas.test.ts
//
// Test de arquitectura: el "hoy" de la institución sale solo de
// lib/helpers/fechaInstitucion.ts. Falla si aparece `setUTCHours(0, 0, 0, 0)`
// o `toISOString().split("T")` en lib/, app/ o features/ fuera del helper y
// de la lista blanca de abajo. Esos dos patrones eran las formas de calcular
// "hoy" con la fecha UTC (que en Argentina cambia a las 21:00 locales).
//
// Cada entrada de la lista blanca fija la cantidad exacta de coincidencias
// del archivo: si aparece una nueva, o si una entrada se queda sin
// coincidencias (excepción muerta), el test falla. Solo lee archivos: no usa
// base de datos.
//
// Es un detector de los dos patrones textuales, no una prueba completa: por
// ejemplo, no detecta `new Date()` comparado directamente contra una fecha.

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const RAIZ = path.resolve(__dirname, "..")
const CARPETAS = ["lib", "app", "features"]
const HELPER = "lib/helpers/fechaInstitucion.ts"

const PATRONES = {
  setUTCHours0: /setUTCHours\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/g,
  isoSplitT:    /toISOString\(\)\s*\.split\(\s*["'`]T["'`]\s*\)/g,
} as const
type Patron = keyof typeof PATRONES

type Excepcion = { archivo: string; patron: Patron; cantidad: number; motivo: string }

const LISTA_BLANCA: Excepcion[] = [
  // Recortan a medianoche una fecha que llega como parámetro o de la base
  // (no la del reloj): normalización de rangos y del cursor de generación.
  { archivo: "lib/services/claseProgramadaService.ts", patron: "setUTCHours0", cantidad: 2,
    motivo: "normalizarRango y resolverClasesPorCalendario recortan fechas recibidas" },
  { archivo: "lib/helpers/clases.ts", patron: "setUTCHours0", cantidad: 1,
    motivo: "cursor de generación de clases a partir del `desde` recibido" },
  { archivo: "lib/usecases/clases/listarClases.ts", patron: "setUTCHours0", cantidad: 1,
    motivo: "normalizarRango del filtro fecha_desde recibido" },
  { archivo: "app/api/dashboard/clases-hoy/route.ts", patron: "setUTCHours0", cantidad: 1,
    motivo: "recorta el parámetro `desde` de la query" },
  { archivo: "lib/repositories/horarioRepository.ts", patron: "setUTCHours0", cantidad: 1,
    motivo: "rangoDeSemana calcula el lunes de la semana recibida" },
  { archivo: "lib/usecases/asignaciones/cambiarTitularAsignacion.ts", patron: "setUTCHours0", cantidad: 1,
    motivo: "recorta fechaDesde recibida (el default ya es hoyLocal())" },
  { archivo: "app/protected/dashboard/periodos-operativos/page.tsx", patron: "setUTCHours0", cantidad: 1,
    motivo: "recorta fecha_hasta del período (dato de la base); hoy sale de hoyLocal()" },
  { archivo: "features/periodosOperativos/components/AvisoPeriodoOperativo.tsx", patron: "setUTCHours0", cantidad: 1,
    motivo: "recorta fecha_hasta del período (dato de la base); hoy sale de hoyLocal()" },

  // Formatean como "YYYY-MM-DD" fechas guardadas en la base (medianoche UTC)
  // o derivadas de hoyLocal(): representación, no cálculo de "hoy".
  { archivo: "lib/reporting/datasets/obtenerJornadas.ts", patron: "isoSplitT", cantidad: 1,
    motivo: "clave por ClaseProgramada.fecha" },
  { archivo: "lib/usecases/asignaciones/cambiarTitularAsignacion.ts", patron: "isoSplitT", cantidad: 3,
    motivo: "fechas de incidencia/titularidad y la elegida, en mensajes de error" },
  { archivo: "lib/reporting/datasets/obtenerRankings.ts", patron: "isoSplitT", cantidad: 2,
    motivo: "desde/hasta del período (derivados de hoyLocal()) en la respuesta" },
  { archivo: "lib/reporting/datasets/obtenerCoberturaPorComision.ts", patron: "isoSplitT", cantidad: 1,
    motivo: "clave por ClaseProgramada.fecha" },
  { archivo: "lib/reporting/transformers/generarTimelineCobertura.ts", patron: "isoSplitT", cantidad: 1,
    motivo: "agrupa por ClaseOperativa.fecha (llamada partida en varias líneas)" },
  { archivo: "lib/pdf/datasets/profesores.ts", patron: "isoSplitT", cantidad: 1,
    motivo: "fmtFecha de fechas guardadas en la base" },
  { archivo: "features/dashboard/components/MapaCalorSemanal.tsx", patron: "isoSplitT", cantidad: 1,
    motivo: "trabaja con mediodía local, correcto; fuera de alcance de la Fase 1" },
]

function listarFuentes(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...listarFuentes(completo))
    else if (/\.(ts|tsx)$/.test(entrada.name)) salida.push(completo)
  }
  return salida
}

function contarCoincidencias(): Map<string, number> {
  const conteo = new Map<string, number>() // clave: "archivo|patron"
  for (const carpeta of CARPETAS) {
    for (const completo of listarFuentes(path.join(RAIZ, carpeta))) {
      const archivo = path.relative(RAIZ, completo).split(path.sep).join("/")
      if (archivo === HELPER) continue
      const contenido = fs.readFileSync(completo, "utf8")
      for (const [patron, regex] of Object.entries(PATRONES)) {
        const n = contenido.match(regex)?.length ?? 0
        if (n > 0) conteo.set(`${archivo}|${patron}`, n)
      }
    }
  }
  return conteo
}

describe("arquitectura: 'hoy' solo desde lib/helpers/fechaInstitucion.ts", () => {
  const conteo = contarCoincidencias()
  const clave = (e: Excepcion) => `${e.archivo}|${e.patron}`

  it("la lista blanca no tiene entradas duplicadas", () => {
    const claves = LISTA_BLANCA.map(clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it("no hay usos de los patrones fuera del helper y de la lista blanca", () => {
    const permitidas = new Set(LISTA_BLANCA.map(clave))
    const fuera = [...conteo.keys()].filter(k => !permitidas.has(k))
    expect(fuera, "Usá hoyLocal()/hoyLocalISO() de lib/helpers/fechaInstitucion.ts, " +
      "o agregá la excepción justificada a LISTA_BLANCA").toEqual([])
  })

  it("cada excepción tiene exactamente la cantidad declarada (ni nuevas ni muertas)", () => {
    const distintas = LISTA_BLANCA
      .map(e => ({ entrada: clave(e), declarada: e.cantidad, encontrada: conteo.get(clave(e)) ?? 0 }))
      .filter(d => d.declarada !== d.encontrada)
    expect(distintas, "encontrada 0 = excepción muerta: sacala de LISTA_BLANCA").toEqual([])
  })

  it("el helper existe y es donde viven los cálculos de 'hoy'", () => {
    expect(fs.existsSync(path.join(RAIZ, HELPER))).toBe(true)
  })
})
