// lib/pdf/documents/codigarios.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, type InstitucionHeader, type Cell } from "../generator"
import type { FilaCodigario } from "../datasets/codigarios"

export function construirDocCodigarios(
  institucion: InstitucionHeader,
  datos:       FilaCodigario[]
): TDocumentDefinitions {

  const body: Cell[] = [
    ...headerReporte(institucion, "Codigarios y artículos"),
  ]

  for (const c of datos) {
    body.push({ text: c.codigarioNombre, style: "subtitulo", margin: [0, 10, 0, 4] })

    const filasItems: Cell[][] = c.items.map((item) => ([
      { text: item.codigo, style: "celdaNormal" },
      { text: item.nombre, style: "celdaNormal" },
      { text: item.descripcion ?? "-", style: "celdaNormal" },
      {
        text: item.activo ? "Activo" : "Inactivo",
        style: "celdaNormal",
        color: item.activo ? "#16a34a" : "#9ca3af",
      },
    ]))

    body.push({
      table: {
        headerRows: 1,
        widths: ["auto", "*", "*", "auto"],
        body: [
          [
            { text: "Código", style: "headerTabla" },
            { text: "Nombre", style: "headerTabla" },
            { text: "Descripción", style: "headerTabla" },
            { text: "Estado", style: "headerTabla" },
          ],
          ...(filasItems.length > 0
            ? filasItems
            : [[{ text: "Sin artículos", style: "celdaNormal", colSpan: 4 }]]),
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
    body.push({ text: "No hay codigarios registrados.", style: "celdaNormal", margin: [0, 12, 0, 0] })
  }

  return {
    pageSize:     "A4",
    pageMargins:  [30, 30, 30, 30],
    content:      body,
    styles:       estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}