// tests/fechaInstitucion.test.ts
//
// Helper de fechas de la institución (lib/helpers/fechaInstitucion.ts).
// Funciones puras con `ahora` inyectado: no usa base de datos. Argentina es
// UTC-3 todo el año, así que 21:00 locales = 00:00Z del día siguiente.

import { describe, it, expect } from "vitest"
import {
  ZONA_POR_DEFECTO,
  hoyLocal,
  hoyLocalISO,
  minutosAhora,
  claseTermino,
} from "../lib/helpers/fechaInstitucion"

const utc = (iso: string) => new Date(iso)
const dia = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)

describe("hoyLocal / hoyLocalISO", () => {
  it("usa Argentina como zona por defecto", () => {
    expect(ZONA_POR_DEFECTO).toBe("America/Argentina/Buenos_Aires")
  })

  it("a las 20:59 locales sigue siendo hoy aunque en UTC falte 1 minuto para mañana", () => {
    const ahora = utc("2026-10-22T23:59:00Z") // 22/10 20:59 AR
    expect(hoyLocal(ahora)).toEqual(dia("2026-10-22"))
    expect(hoyLocalISO(ahora)).toBe("2026-10-22")
  })

  it("a las 21:00 locales sigue siendo hoy aunque en UTC ya sea mañana", () => {
    const ahora = utc("2026-10-23T00:00:00Z") // 22/10 21:00 AR
    expect(hoyLocal(ahora)).toEqual(dia("2026-10-22"))
    expect(hoyLocalISO(ahora)).toBe("2026-10-22")
  })

  it("cambia de día a la medianoche local", () => {
    expect(hoyLocalISO(utc("2026-10-23T02:59:59Z"))).toBe("2026-10-22") // 23:59:59 AR
    expect(hoyLocalISO(utc("2026-10-23T03:00:00Z"))).toBe("2026-10-23") // 00:00 AR
  })

  it("devuelve medianoche UTC", () => {
    const hoy = hoyLocal(utc("2026-10-22T15:30:00Z"))
    expect(hoy.toISOString()).toBe("2026-10-22T00:00:00.000Z")
  })

  it("cambio de mes", () => {
    expect(hoyLocalISO(utc("2026-11-01T02:00:00Z"))).toBe("2026-10-31") // 31/10 23:00 AR
    expect(hoyLocalISO(utc("2026-11-01T03:00:00Z"))).toBe("2026-11-01")
  })

  it("cambio de año", () => {
    expect(hoyLocalISO(utc("2027-01-01T02:59:00Z"))).toBe("2026-12-31") // 31/12 23:59 AR
    expect(hoyLocalISO(utc("2027-01-01T03:00:00Z"))).toBe("2027-01-01")
  })

  it("respeta otra zona si se indica", () => {
    expect(hoyLocalISO(utc("2026-10-23T00:00:00Z"), "UTC")).toBe("2026-10-23")
  })
})

describe("minutosAhora", () => {
  it("cuenta minutos desde la medianoche local", () => {
    expect(minutosAhora(utc("2026-10-22T13:20:00Z"))).toBe(10 * 60 + 20) // 10:20 AR
  })

  it("vale 0 a la medianoche local", () => {
    expect(minutosAhora(utc("2026-10-23T03:00:00Z"))).toBe(0)
  })

  it("a las 21:00 locales vale 1260, no 0", () => {
    expect(minutosAhora(utc("2026-10-23T00:00:00Z"))).toBe(21 * 60)
  })
})

describe("claseTermino", () => {
  const HASTA_10_20 = 10 * 60 + 20

  it("un módulo que termina 10:20 no terminó a las 10:19", () => {
    expect(claseTermino({
      fecha: dia("2026-10-22"), horaHasta: HASTA_10_20,
      ahora: utc("2026-10-22T13:19:00Z"),
    })).toBe(false)
  })

  it("un módulo que termina 10:20 terminó a las 10:20", () => {
    expect(claseTermino({
      fecha: dia("2026-10-22"), horaHasta: HASTA_10_20,
      ahora: utc("2026-10-22T13:20:00Z"),
    })).toBe(true)
  })

  it("una clase de ayer terminó, aunque sea temprano", () => {
    expect(claseTermino({
      fecha: dia("2026-10-21"), horaHasta: 23 * 60,
      ahora: utc("2026-10-22T03:00:00Z"), // 22/10 00:00 AR
    })).toBe(true)
  })

  it("una clase de mañana no terminó a las 21:00 locales (día UTC ya cambiado)", () => {
    expect(claseTermino({
      fecha: dia("2026-10-23"), horaHasta: 8 * 60,
      ahora: utc("2026-10-23T00:00:00Z"), // 22/10 21:00 AR
    })).toBe(false)
  })

  it("jornal (sin hora): hoy no terminó, ni siquiera a las 23:59", () => {
    expect(claseTermino({
      fecha: dia("2026-10-22"), horaHasta: null,
      ahora: utc("2026-10-23T02:59:00Z"), // 22/10 23:59 AR
    })).toBe(false)
  })

  it("jornal (sin hora): ayer sí terminó", () => {
    expect(claseTermino({
      fecha: dia("2026-10-21"), horaHasta: null,
      ahora: utc("2026-10-22T03:00:00Z"),
    })).toBe(true)
  })

  it("cambio de año: la clase del 31/12 terminó el 01/01", () => {
    expect(claseTermino({
      fecha: dia("2026-12-31"), horaHasta: null,
      ahora: utc("2027-01-01T03:00:00Z"),
    })).toBe(true)
  })
})
