// lib/pdf/documents/modulosComputables.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, type InstitucionHeader, type Cell } from "../generator"
import type { DetalleClaseComputable, FilaResumenDocente } from "@/lib/reporting/datasets/obtenerModulosComputables"

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

export type DatosPDFModulosComputables =
  | {
      modo:                    "detalle"
      agenteNombre:            string
      agenteDocumento:         string
      periodo:                 { desde: Date; hasta: Date }
      totalClases:             number
      totalModulosComputables: number
      detalle:                 DetalleClaseComputable[]
    }
  | {
      modo:    "resumen"
      periodo: { desde: Date; hasta: Date }
      resumen: FilaResumenDocente[]
    }

const layoutTabla = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => "#d1d5db",
  vLineColor: () => "#d1d5db",
}

export function construirDocModulosComputables(
  institucion: InstitucionHeader,
  datos:       DatosPDFModulosComputables
): TDocumentDefinitions {
  const subtitulo = datos.modo === "detalle"
    ? `${datos.agenteNombre} (DNI ${datos.agenteDocumento}) — ${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}`
    : `Todos los docentes — ${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}`

  const body: Cell[] = [
    ...headerReporte(institucion, "Módulos computables"),
    { text: subtitulo, style: "subtitulo", margin: [0, 10, 0, 4] },
  ]

  if (datos.modo === "detalle") {
    const filas: Cell[][] = datos.detalle.map((d) => ([
      { text: formatFecha(d.fecha), style: "celdaNormal" },
      {
        text: d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "—",
        style: "celdaNormal",
      },
      {
        text: `${d.porcentajeComputable}%`,
        style: "celdaNormal",
        color: d.porcentajeComputable === 0 ? "#dc2626" : undefined,
      },
    ]))
    body.push({
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto"],
        body: [
          [
            { text: "Fecha", style: "headerTabla" },
            { text: "Incidencia", style: "headerTabla" },
            { text: "% Computable", style: "headerTabla" },
          ],
          ...(filas.length > 0
            ? filas
            : [[{ text: "Sin clases en el período", style: "celdaNormal", colSpan: 3 }]]),
        ] as Cell[][],
      },
      layout: layoutTabla,
      margin: [0, 0, 0, 8],
    })
    body.push({
      text: `Total de clases: ${datos.totalClases}    Módulos computables: ${datos.totalModulosComputables}`,
      style: "celdaNormal",
      bold: true,
      margin: [0, 6, 0, 0],
    })
  } else {
    const filas: Cell[][] = datos.resumen.map((f) => ([
      { text: f.agenteNombre, style: "celdaNormal" },
      { text: f.agenteDocumento, style: "celdaNormal" },
      { text: String(f.totalClases), style: "celdaNormal" },
      { text: String(f.totalModulosComputables), style: "celdaNormal", bold: true },
    ]))
    body.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto"],
        body: [
          [
            { text: "Docente", style: "headerTabla" },
            { text: "DNI", style: "headerTabla" },
            { text: "Total de clases", style: "headerTabla" },
            { text: "Módulos computables", style: "headerTabla" },
          ],
          ...(filas.length > 0
            ? filas
            : [[{ text: "No hay docentes con titularidad vigente en el período.", style: "celdaNormal", colSpan: 4 }]]),
        ] as Cell[][],
      },
      layout: layoutTabla,
      margin: [0, 0, 0, 8],
    })
    body.push({
      text: `Total de docentes: ${datos.resumen.length}`,
      style: "celdaNormal",
      bold: true,
      margin: [0, 6, 0, 0],
    })
  }

  return {
    pageSize:     "A4",
    pageMargins:  [30, 30, 30, 30],
    content:      body,
    styles:       estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}