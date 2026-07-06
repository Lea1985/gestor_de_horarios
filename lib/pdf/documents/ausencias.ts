// lib/pdf/documents/ausencias.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, formatFecha, type InstitucionHeader, type Cell } from "../generator"
import type { FilaAusencia } from "../datasets/ausencias"

export function construirDocAusencias(
  institucion: InstitucionHeader,
  filas:       FilaAusencia[],
  periodo:     { desde: Date; hasta: Date },
  filtroTexto?: string
): TDocumentDefinitions {

  const subtitulo = `Período: ${formatFecha(periodo.desde)} al ${formatFecha(periodo.hasta)}${filtroTexto ? " — " + filtroTexto : ""}`

  const widths = ["auto", "auto", "*", "*", "*", "*"]

  const filasTabla: Cell[][] = []

  for (const f of filas) {
    const etiquetaTitular   = f.esRaiz ? "TITULAR"   : "REEMPLAZA A"
    const etiquetaReemplazo = f.esRaiz ? "REEMPLAZO" : "NUEVO REEMPLAZO"

    const numFilas = (!f.esRaiz && f.incidenciaPadreId) ? 3 : 2

    // Fila 1: titular (o suplente saliente, si es incidencia hija)
    filasTabla.push([
      { text: `#${f.incidenciaId}`, style: "celdaDestacada", rowSpan: numFilas },
      { text: `${formatFecha(f.fechaDesde)} —\n${formatFecha(f.fechaHasta)}`, style: "celdaNormal", rowSpan: numFilas },
      { text: etiquetaTitular, style: "etiqueta", fillColor: "#eff6ff" },
      { text: `${f.titularNombre} (DNI ${f.titularDNI})`, style: "celdaNormal" },
      { text: f.identificador, style: "celdaNormal" },
      { text: [f.materia, f.comision].filter(Boolean).join(" / ") || "-", style: "celdaNormal" },
    ])
    // Fila 2: reemplazante (o "sin reemplazo")
    filasTabla.push([
      { text: "" },
      { text: "" },
      { text: etiquetaReemplazo, style: "etiqueta", fillColor: "#fef3c7" },
      {
        text: f.reemplazante
          ? `${f.reemplazante.nombre} (DNI ${f.reemplazante.documento})`
          : "Sin reemplazo asignado",
        style: "celdaNormal",
        italics: !f.reemplazante,
        color: f.reemplazante ? undefined : "#9ca3af",
      },
      { text: f.identificador, style: "celdaNormal" },
      { text: f.distribucion || "-", style: "nota" },
    ])

    // Fila 3 (solo si es hija): referencia a la cadena
    if (!f.esRaiz && f.incidenciaPadreId) {
      filasTabla.push([
        { text: "" },
        { text: "" },
        {
          text: `↳ Cadena: incidencia #${f.incidenciaPadreId}`,
          style: "nota",
          colSpan: 4,
          italics: true,
        },
        {}, {}, {},
      ])
    }
  }

  const body: Cell[] = [
    ...headerReporte(institucion, "Ausencias y reemplazos", subtitulo),
    {
      table: {
        headerRows: 1,
        widths,
        body: [
          [
            { text: "Incidencia", style: "headerTabla" },
            { text: "Período", style: "headerTabla" },
            { text: "Rol", style: "headerTabla" },
            { text: "Agente", style: "headerTabla" },
            { text: "Identificador", style: "headerTabla" },
            { text: "Materia / Comisión / Distribución", style: "headerTabla" },
          ],
          ...(filasTabla.length > 0
            ? filasTabla
            : [[{ text: "No se encontraron incidencias en el período", style: "celdaNormal", colSpan: 6 }]]),
        ] as Cell[][],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
    },
    {
      text: `Total de incidencias: ${filas.length}  |  Con reemplazo: ${filas.filter(f => f.reemplazante).length}  |  Sin cubrir: ${filas.filter(f => !f.reemplazante).length}`,
      style: "nota",
      margin: [0, 8, 0, 0],
    },
    {
      text: "Nota: en incidencias que forman parte de una cadena (reemplazo de un reemplazo), la fila \"Reemplaza a\" indica el suplente que estaba cubriendo antes, y \"Nuevo reemplazo\" quien lo reemplaza en ese período puntual. La referencia \"Cadena\" indica la incidencia original del titular.",
      style: "nota",
      margin: [0, 4, 0, 0],
    },
  ]

  return {
    pageSize:     "A4",
    pageOrientation: "landscape",
    pageMargins:  [30, 30, 30, 30],
    content:      body,
    styles:       estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}
