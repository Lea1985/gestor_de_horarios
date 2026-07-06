// lib/pdf/documents/asignaciones.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, formatFecha, type InstitucionHeader, type Cell } from "../generator"
import type { FilaAsignacion } from "../datasets/asignaciones"

export function construirDocAsignaciones(
  institucion: InstitucionHeader,
  filas:       FilaAsignacion[],
  filtroTexto?: string
): TDocumentDefinitions {

  const body: Cell[] = [
    ...headerReporte(institucion, "Asignaciones y distribuciones horarias", filtroTexto),
  ]

  for (const a of filas) {
    body.push({
      columns: [
        {
          width: "*",
          stack: [
            { text: a.identificador, style: "subtitulo", margin: [0, 10, 0, 0] },
            { text: a.titular + (a.titularDNI !== "-" ? ` (DNI ${a.titularDNI})` : ""), style: "valor" },
            { text: [a.materia, a.comision, a.turno, a.unidad].filter(Boolean).join(" — "), style: "nota" },
          ],
        },
      ],
    })

    const filasDist: Cell[][] = a.distribuciones.map(d => ([
      { text: `v${d.version}`, style: "celdaNormal" },
      {
        text: d.vigente ? "Vigente" : "Histórica",
        style: "celdaNormal",
        color: d.vigente ? "#16a34a" : "#9ca3af",
        bold:  d.vigente,
      },
      { text: formatFecha(d.desde), style: "celdaNormal" },
      { text: d.hasta ? formatFecha(d.hasta) : "—", style: "celdaNormal" },
      { text: d.modulos, style: "celdaNormal" },
    ]))

    body.push({
      table: {
        headerRows: 1,
        widths: ["auto", "auto", "auto", "auto", "*"],
        body: [
          [
            { text: "Versión", style: "headerTabla" },
            { text: "Estado", style: "headerTabla" },
            { text: "Vigencia desde", style: "headerTabla" },
            { text: "Vigencia hasta", style: "headerTabla" },
            { text: "Módulos", style: "headerTabla" },
          ],
          ...(filasDist.length > 0
            ? filasDist
            : [[{ text: "Sin distribuciones registradas", style: "celdaNormal", colSpan: 5 }]]),
        ] as Cell[][],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
      margin: [0, 4, 0, 4],
    })
  }

  if (filas.length === 0) {
    body.push({ text: "No se encontraron asignaciones para los filtros seleccionados.", style: "celdaNormal", margin: [0, 12, 0, 0] })
  }

  return {
    pageSize:     "A4",
    pageMargins:  [30, 30, 30, 30],
    content:      body,
    styles:       estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}