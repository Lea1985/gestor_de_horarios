// lib/pdf/documents/profesores.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import { headerReporte, estilosBase, type InstitucionHeader, type Cell } from "../generator"
import type { FilaProfesor } from "../datasets/profesores"

export function construirDocProfesores(
  institucion: InstitucionHeader,
  filas:       FilaProfesor[],
  filtro:      "todos" | "planta" | "suplentes"
): TDocumentDefinitions {

  const subtitulo = {
    todos:      "Todos los profesores",
    planta:     "Profesores de planta (con asignación titular)",
    suplentes:  "Profesores sin asignación titular (solo reemplazos)",
  }[filtro]

  const filasTabla: Cell[][] = filas.map((p) => {
    const asignacionesTexto = p.asignaciones.length > 0
      ? p.asignaciones.map(a => `${a.identificador}${a.materia ? " · " + a.materia : ""}`).join("\n")
      : "—"
    return [
      { text: `${p.apellido}, ${p.nombre}`, style: "celdaNormal" },
      { text: p.documento, style: "celdaNormal" },
      { text: p.email ?? "-", style: "celdaNormal" },
      { text: p.telefono ?? "-", style: "celdaNormal" },
      {
        text: p.esPlanta ? "Planta" : "Suplente",
        style: "celdaNormal",
        color: p.esPlanta ? "#16a34a" : "#d97706",
        bold:  true,
      },
      { text: asignacionesTexto, style: "celdaNormal" },
    ]
  })

  const body: Cell[] = [
    ...headerReporte(institucion, "Listado de profesores", subtitulo),
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "*", "auto", "auto", "*"],
        body: [
          [
            { text: "Apellido, Nombre", style: "headerTabla" },
            { text: "DNI", style: "headerTabla" },
            { text: "Email", style: "headerTabla" },
            { text: "Teléfono", style: "headerTabla" },
            { text: "Tipo", style: "headerTabla" },
            { text: "Asignaciones", style: "headerTabla" },
          ],
          ...(filasTabla.length > 0
            ? filasTabla
            : [[{ text: "Sin resultados", style: "celdaNormal", colSpan: 6 }]]),
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
      text: `Total: ${filas.length}  |  Planta: ${filas.filter(f => f.esPlanta).length}  |  Suplentes: ${filas.filter(f => !f.esPlanta).length}`,
      style: "nota",
      margin: [0, 8, 0, 0],
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