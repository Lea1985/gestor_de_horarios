// lib/pdf/documents/horarios.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, DIAS_ES, formatHora, type InstitucionHeader, type Cell } from "../generator"
import type { DatosReporteHorarios } from "../datasets/horarios"
export function construirDocHorarios(
  institucion:    InstitucionHeader,
  datos:          DatosReporteHorarios[],
  conACargoAhora: boolean
): TDocumentDefinitions {
  const columnasHeader = conACargoAhora
    ? ["Día", "Horario", "Materia", "Identificador", "Titular", "DNI Titular", "A cargo ahora"]
    : ["Día", "Horario", "Materia", "Identificador", "Titular", "DNI Titular"]
  const widths = conACargoAhora
    ? ["auto", "auto", "*", "auto", "*", "auto", "*"]
    : ["auto", "auto", "*", "auto", "*", "auto"]
  const body: Cell[] = [
    ...headerReporte(institucion, "Horarios por comisión"),
  ]
  for (const grupo of datos) {
    const subtitulo = [
      grupo.comision.curso,
      grupo.comision.nombre,
      grupo.comision.turno,
      grupo.comision.unidad,
    ].filter(Boolean).join(" — ")
    body.push({ text: subtitulo, style: "subtitulo", margin: [0, 10, 0, 4] })
    const filasTabla: Cell[][] = grupo.filas.map((f) => {
      const fila: Cell[] = [
        { text: DIAS_ES[f.dia] ?? f.dia, style: "celdaNormal" },
        { text: `${formatHora(f.horaDesde)}–${formatHora(f.horaHasta)}`, style: "celdaNormal" },
        { text: f.materia ?? "-", style: "celdaNormal" },
        { text: f.identificador, style: "celdaNormal" },
        { text: f.titularNombre, style: "celdaNormal" },
        { text: f.titularDNI, style: "celdaNormal" },
      ]
      if (conACargoAhora) {
        fila.push({
          text: f.esSuplente ? (f.aCargoNombre ?? "-") : f.titularNombre,
          style: f.esSuplente ? "celdaDestacada" : "celdaNormal",
        })
      }
      return fila
    })
    body.push({
      table: {
        headerRows: 1,
        widths,
        body: [
          columnasHeader.map(c => ({ text: c, style: "headerTabla" })),
          ...(filasTabla.length > 0
            ? filasTabla
            : [[{ text: "Sin módulos asignados", style: "celdaNormal", colSpan: columnasHeader.length }]]),
        ] as Cell[][],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
      margin: [0, 0, 0, 8],
    })
  }
  if (datos.length === 0) {
    body.push({ text: "No hay comisiones para mostrar.", style: "celdaNormal", margin: [0, 12, 0, 0] })
  }
  if (conACargoAhora) {
    body.push({
      text: "Nota: la columna \"A cargo ahora\" indica el agente que cubre el módulo hoy, si hay un reemplazo activo. En su ausencia, figura el titular.",
      style: "nota",
      margin: [0, 8, 0, 0],
    })
  }
  return {
    pageSize:    "A4",
    pageMargins: [30, 30, 30, 30],
    content:     body,
    styles:      estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}