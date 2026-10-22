// lib/helpers/fechaInstitucion.ts
//
// Única fuente de "hoy" del sistema. Las fechas sin hora (ClaseProgramada.fecha,
// fecha_desde/fecha_hasta de períodos, distribuciones, incidencias, etc.) se
// guardan como medianoche UTC; eso no cambia. Lo que decide este helper es
// cuál fecha de calendario es "hoy" para la institución: la fecha UTC del
// reloj no sirve, porque en Argentina (UTC-3) cambia a las 21:00 locales.
//
// Funciones puras, sin imports de servidor ni de Prisma: se usan también en
// el navegador. `ahora` es inyectable para testear; la zona se resuelve con
// Intl.DateTimeFormat, sin depender de la zona del proceso.

export const ZONA_POR_DEFECTO = "America/Argentina/Buenos_Aires"

const formateadores = new Map<string, Intl.DateTimeFormat>()

function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone:  zona,
      year:      "numeric",
      month:     "2-digit",
      day:       "2-digit",
      hour:      "2-digit",
      minute:    "2-digit",
      hourCycle: "h23",
    })
    formateadores.set(zona, f)
  }
  return f
}

function partesLocales(ahora: Date, zona: string) {
  const partes: Record<string, number> = {}
  for (const p of formateador(zona).formatToParts(ahora)) {
    if (p.type !== "literal") partes[p.type] = Number(p.value)
  }
  return {
    anio:   partes.year,
    mes:    partes.month,
    dia:    partes.day,
    // Algunos motores devuelven "24" a la medianoche aun con h23.
    hora:   partes.hour === 24 ? 0 : partes.hour,
    minuto: partes.minute,
  }
}

/** Fecha de calendario de la institución, como medianoche UTC. */
export function hoyLocal(ahora: Date = new Date(), zona: string = ZONA_POR_DEFECTO): Date {
  const { anio, mes, dia } = partesLocales(ahora, zona)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

/** Fecha de calendario de la institución como "YYYY-MM-DD". */
export function hoyLocalISO(ahora: Date = new Date(), zona: string = ZONA_POR_DEFECTO): string {
  return hoyLocal(ahora, zona).toISOString().slice(0, 10)
}

/** Minutos transcurridos desde la medianoche local de la institución. */
export function minutosAhora(ahora: Date = new Date(), zona: string = ZONA_POR_DEFECTO): number {
  const { hora, minuto } = partesLocales(ahora, zona)
  return hora * 60 + minuto
}

/**
 * true si la clase ya terminó: su fecha es anterior a hoy, o es hoy y ya
 * pasó horaHasta (minutos desde medianoche). Con horaHasta null se toma el
 * fin del día: solo terminó si la fecha es anterior a hoy.
 */
export function claseTermino(params: {
  fecha:     Date
  horaHasta: number | null
  ahora?:    Date
  zona?:     string
}): boolean {
  const ahora = params.ahora ?? new Date()
  const zona  = params.zona ?? ZONA_POR_DEFECTO
  const hoy   = hoyLocal(ahora, zona).getTime()
  const f     = params.fecha
  const fecha = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate())
  if (fecha < hoy) return true
  if (fecha > hoy || params.horaHasta === null) return false
  return minutosAhora(ahora, zona) >= params.horaHasta
}
