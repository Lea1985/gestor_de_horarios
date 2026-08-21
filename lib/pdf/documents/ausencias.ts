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

  let idx = 0
  while (idx < filas.length) {
    const primero = filas[idx]
    const tramos  = filas.slice(idx, idx + primero.totalTramos)
    const esHija  = !primero.esRaiz && !!primero.incidenciaPadreId
    const rowSpanIncidencia = 1 + tramos.length + (esHija ? 1 : 0)

    const periodoDesde = tramos.reduce((min, t) => t.fechaDesde < min ? t.fechaDesde : min, tramos[0].fechaDesde)
    const periodoHasta = tramos.reduce((max, t) => t.fechaHasta > max ? t.fechaHasta : max, tramos[0].fechaHasta)

    const etiquetaTitular   = primero.esRaiz ? "TITULAR"   : "REEMPLAZA A"
    const etiquetaReemplazo = primero.esRaiz ? "REEMPLAZO" : "NUEVO REEMPLAZO"

    filasTabla.push([
      { text: `#${primero.incidenciaId}`, style: "celdaDestacada", rowSpan: rowSpanIncidencia },
      { text: `${formatFecha(periodoDesde)} —\n${formatFecha(periodoHasta)}`, style: "celdaNormal" },
      { text: etiquetaTitular, style: "etiqueta", fillColor: "#eff6ff" },
      { text: `${primero.titularNombre} (DNI ${primero.titularDNI})`, style: "celdaNormal" },
      { text: primero.identificador, style: "celdaNormal" },
      { text: [primero.materia, primero.comision].filter(Boolean).join(" / ") || "-", style: "celdaNormal" },
    ])

    for (const f of tramos) {
      filasTabla.push([
        {},
        { text: `${formatFecha(f.fechaDesde)} —\n${formatFecha(f.fechaHasta)}`, style: "celdaNormal" },
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
    }

    if (esHija) {
      filasTabla.push([
        {},
        {},
        {
          text: `↳ Cadena: incidencia #${primero.incidenciaPadreId}`,
          style: "nota",
          colSpan: 4,
          italics: true,
        },
        {}, {}, {},
      ])
    }

    idx += primero.totalTramos
  }

  const incidenciasUnicas   = new Set(filas.map(f => f.incidenciaId)).size
  const tramosConReemplazo  = filas.filter(f => f.reemplazante).length
  const tramosSinCobertura  = filas.filter(f => !f.reemplazante).length

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
      text: `Total de incidencias: ${incidenciasUnicas}  |  Tramos con reemplazo: ${tramosConReemplazo}  |  Tramos sin cobertura: ${tramosSinCobertura}`,
      style: "nota",
      margin: [0, 8, 0, 0],
    },
    {
      text: "Nota: una incidencia puede aparecer con más de un tramo de reemplazo -- o quedar sin cubrir -- en distintos módulos dentro de su propio período; cada línea bajo el título representa un tramo consistente. En incidencias que forman parte de una cadena (reemplazo de un reemplazo), la fila título indica el suplente que estaba cubriendo antes (\"Reemplaza a\"), y \"Nuevo reemplazo\" quien lo reemplaza en ese período puntual. La referencia \"Cadena\" indica la incidencia original del titular.",
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