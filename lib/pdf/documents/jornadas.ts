// lib/pdf/documents/jornadas.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, type InstitucionHeader, type Cell } from "../generator"
import type { DetalleJornada, FilaResumenJornada } from "@/lib/reporting/datasets/obtenerJornadas"

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

const ETIQUETA_ESTADO: Record<string, string> = {
  trabajado:     "Trabajado",
  reemplazado:   "Con reemplazo",
  sin_cobertura: "Sin cobertura",
  feriado:       "Feriado",
}

export type DatosPDFJornadas =
  | {
      modo:            "detalle"
      agenteNombre:    string
      agenteDocumento: string
      periodo:         { desde: Date; hasta: Date }
      totalDias:       number
      diasComputables: number
      detalle:         DetalleJornada[]
    }
  | {
      modo:    "resumen"
      periodo: { desde: Date; hasta: Date }
      resumen: FilaResumenJornada[]
    }

const layoutTabla = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => "#d1d5db",
  vLineColor: () => "#d1d5db",
}

export function construirDocJornadas(
  institucion: InstitucionHeader,
  datos:       DatosPDFJornadas
): TDocumentDefinitions {
  const subtitulo = datos.modo === "detalle"
    ? `${datos.agenteNombre} (DNI ${datos.agenteDocumento}) — ${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}`
    : `Todos los cargos jornalizados — ${formatFecha(datos.periodo.desde)} al ${formatFecha(datos.periodo.hasta)}`

  const body: Cell[] = [
    ...headerReporte(institucion, "Jornadas (cargos jornalizados)"),
    { text: subtitulo, style: "subtitulo", margin: [0, 10, 0, 4] },
  ]

  if (datos.modo === "detalle") {
    const filas: Cell[][] = datos.detalle.map((d) => ([
      { text: formatFecha(d.fecha), style: "celdaNormal" },
      { text: ETIQUETA_ESTADO[d.estado] ?? d.estado, style: "celdaNormal" },
      {
        text: d.incidenciaId ? `${d.codigarioItemCodigo} — ${d.codigarioItemNombre}` : "—",
        style: "celdaNormal",
      },
      {
        text: `${d.porcentajePagado}%`,
        style: "celdaNormal",
        color: d.porcentajePagado === 0 ? "#dc2626" : undefined,
      },
    ]))
    body.push({
      table: {
        headerRows: 1,
        widths: ["auto", "auto", "*", "auto"],
        body: [
          [
            { text: "Fecha", style: "headerTabla" },
            { text: "Estado", style: "headerTabla" },
            { text: "Incidencia", style: "headerTabla" },
            { text: "% Pagado", style: "headerTabla" },
          ],
          ...(filas.length > 0
            ? filas
            : [[{ text: "Sin jornadas en el período", style: "celdaNormal", colSpan: 4 }]]),
        ] as Cell[][],
      },
      layout: layoutTabla,
      margin: [0, 0, 0, 8],
    })
    body.push({
      text: `Total de días: ${datos.totalDias}    Días computables: ${datos.diasComputables}`,
      style: "celdaNormal",
      bold: true,
      margin: [0, 6, 0, 0],
    })
  } else {
    const filas: Cell[][] = datos.resumen.map((f) => ([
      { text: f.agenteNombre, style: "celdaNormal" },
      { text: f.agenteDocumento, style: "celdaNormal" },
      { text: String(f.totalDias), style: "celdaNormal" },
      { text: String(f.diasComputables), style: "celdaNormal", bold: true },
    ]))
    body.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto"],
        body: [
          [
            { text: "Agente", style: "headerTabla" },
            { text: "DNI", style: "headerTabla" },
            { text: "Total de días", style: "headerTabla" },
            { text: "Días computables", style: "headerTabla" },
          ],
          ...(filas.length > 0
            ? filas
            : [[{ text: "No hay agentes con cargo jornalizado en el período.", style: "celdaNormal", colSpan: 4 }]]),
        ] as Cell[][],
      },
      layout: layoutTabla,
      margin: [0, 0, 0, 8],
    })
    body.push({
      text: `Total de agentes: ${datos.resumen.length}`,
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