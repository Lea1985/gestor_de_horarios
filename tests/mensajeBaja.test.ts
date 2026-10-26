// tests/mensajeBaja.test.ts
//
// Texto que ven los usuarios cuando una baja no se aplica porque cambiaría
// clases ya dictadas (409 con el aviso). Función pura, sin base ni servidor.

import { describe, it, expect } from "vitest"
import { mensajeErrorBaja } from "../lib/helpers/mensajeBaja"

const aviso = (...fechas: string[]) => ({
  ok: false, requiereConfirmacion: true,
  aviso: { dictadasAReescribir: fechas.map((fecha, i) => ({ claseId: i, fecha, moduloId: 1 })) },
})

describe("mensajeErrorBaja", () => {
  it("una clase: singular y la fecha en dd/mm/aaaa", () => {
    expect(mensajeErrorBaja(aviso("2026-10-29"), "Error eliminando"))
      .toBe("No se aplicó la baja: cambiaría 1 clase ya dictada (29/10/2026).")
  })

  it("hasta 5 fechas: todas, ordenadas, con 'y' al final", () => {
    expect(mensajeErrorBaja(aviso("2026-11-05", "2026-10-29", "2026-11-12"), "Error eliminando"))
      .toBe("No se aplicó la baja: cambiaría 3 clases ya dictadas (29/10/2026, 05/11/2026 y 12/11/2026).")
  })

  it("más de 5 fechas: las primeras 5 y 'y N más'", () => {
    const fechas = ["2026-10-29", "2026-11-05", "2026-11-12", "2026-11-19", "2026-11-26", "2026-12-03", "2026-12-10"]
    expect(mensajeErrorBaja(aviso(...fechas), "Error eliminando"))
      .toBe("No se aplicó la baja: cambiaría 7 clases ya dictadas (29/10/2026, 05/11/2026, 12/11/2026, 19/11/2026, 26/11/2026 y 2 más).")
  })

  it("sin aviso: el error del backend, o el genérico", () => {
    expect(mensajeErrorBaja({ error: "Tiene incidencias" }, "Error eliminando")).toBe("Tiene incidencias")
    expect(mensajeErrorBaja({}, "Error eliminando")).toBe("Error eliminando")
    expect(mensajeErrorBaja(null, "Error eliminando")).toBe("Error eliminando")
  })

  it("no usa términos técnicos", () => {
    expect(mensajeErrorBaja(aviso("2026-10-29"), "x")).not.toMatch(/requiereConfirmacion|aviso|DICTADA/)
  })
})
