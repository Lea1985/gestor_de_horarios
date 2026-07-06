// lib/pdf/documents/profesor.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, formatFecha, type InstitucionHeader, type Cell } from "../generator"
import type { DatosReporteProfesor } from "../datasets/profesor"

export function construirDocProfesor(
  institucion: InstitucionHeader,
  datos:       DatosReporteProfesor
): TDocumentDefinitions {

  const { agente } = datos

  const body: Cell[] = [
    ...headerReporte(institucion, "Ficha de profesor", `${agente.apellido}, ${agente.nombre}`),

    // Datos personales
    {
      table: {
        widths: ["auto", "*", "auto", "*"],
        body: [
          [
            { text: "DNI", style: "etiqueta" }, { text: agente.documento, style: "valor" },
            { text: "Email", style: "etiqueta" }, { text: agente.email ?? "-", style: "valor" },
          ],
          [
            { text: "Teléfono", style: "etiqueta" }, { text: agente.telefono ?? "-", style: "valor" },
            { text: "Domicilio", style: "etiqueta" }, { text: agente.domicilio ?? "-", style: "valor" },
          ],
        ] as Cell[][],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 12],
    },

    { text: "Asignaciones", style: "subtitulo" },
  ]

  if (datos.asignaciones.length === 0) {
    body.push({ text: "Sin asignaciones registradas.", style: "celdaNormal", margin: [0, 4, 0, 8] })
  }

  for (const a of datos.asignaciones) {
    body.push({
      text: `${a.identificador}${a.materia ? " — " + a.materia : ""}`,
      style: "valor",
      bold: true,
      margin: [0, 8, 0, 2],
    })
    body.push({
      text: [a.comision, a.turno, a.unidad].filter(Boolean).join(" — "),
      style: "nota",
      margin: [0, 0, 0, 4],
    })

    // Distribuciones vigentes vs históricas
    const vigentes   = a.distribuciones.filter(d => d.vigente)
    const historicas = a.distribuciones.filter(d => !d.vigente)

    const filasDist: Cell[][] = [...vigentes, ...historicas].map(d => ([
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
            { text: "Desde", style: "headerTabla" },
            { text: "Hasta", style: "headerTabla" },
            { text: "Módulos", style: "headerTabla" },
          ],
          ...(filasDist.length > 0
            ? filasDist
            : [[{ text: "Sin distribuciones", style: "celdaNormal", colSpan: 5 }]]),
        ] as Cell[][],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
      margin: [0, 0, 0, 4],
    })

    // Incidencias de esta asignación
    if (a.incidencias.length > 0) {
      const filasInc: Cell[][] = a.incidencias.map(i => ([
        { text: `#${i.id}`, style: "celdaNormal" },
        { text: `${formatFecha(i.fechaDesde)} — ${formatFecha(i.fechaHasta)}`, style: "celdaNormal" },
        { text: `${i.codigo} — ${i.nombre}`, style: "celdaNormal" },
        { text: i.observacion ?? "-", style: "celdaNormal" },
      ]))

      body.push({
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "*"],
          body: [
            [
              { text: "Incidencia", style: "headerTabla" },
              { text: "Período", style: "headerTabla" },
              { text: "Tipo", style: "headerTabla" },
              { text: "Observación", style: "headerTabla" },
            ],
            ...filasInc,
          ] as Cell[][],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#d1d5db",
          vLineColor: () => "#d1d5db",
        },
        margin: [0, 0, 0, 10],
      })
    }
  }

  // Bloque separado: reemplazos como suplente
  body.push({ text: "Reemplazos realizados (como suplente)", style: "subtitulo", margin: [0, 12, 0, 4] })

  if (datos.reemplazosComoSuplente.length === 0) {
    body.push({ text: "Sin reemplazos registrados.", style: "celdaNormal" })
  } else {
    const filasReemplazos: Cell[][] = datos.reemplazosComoSuplente.map(r => ([
      { text: formatFecha(r.fecha), style: "celdaNormal" },
      { text: r.asignacion, style: "celdaNormal" },
      { text: r.titularNombre, style: "celdaNormal" },
      { text: r.titularDNI, style: "celdaNormal" },
    ]))

    body.push({
      table: {
        headerRows: 1,
        widths: ["auto", "*", "*", "auto"],
        body: [
          [
            { text: "Fecha", style: "headerTabla" },
            { text: "Asignación cubierta", style: "headerTabla" },
            { text: "Titular reemplazado", style: "headerTabla" },
            { text: "DNI", style: "headerTabla" },
          ],
          ...filasReemplazos,
        ] as Cell[][],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
      },
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