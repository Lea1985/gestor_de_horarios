// lib/pdf/documents/dashboard.ts
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import {
  headerReporte,
  estilosBase,
  formatFecha,
  type InstitucionHeader,
  type Cell,
} from "../generator"
import type { DatosDashboardPDF } from "../datasets/dashboard"

function kpiBox(label: string, valor: string, color?: string): Cell {
  return {
    stack: [
      { text: label, style: "etiqueta", margin: [0, 0, 0, 2] },
      { text: valor, fontSize: 18, bold: true, color: color ?? "#1a1a2e" },
    ],
    margin: [0, 0, 0, 0],
  }
}

function tablaVacia(cols: number, mensaje: string): Cell {
  return {
    table: {
      widths: Array(cols).fill("*"),
      body: [[{ text: mensaje, style: "celdaNormal", colSpan: cols, alignment: "center" }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#d1d5db",
      vLineColor: () => "#d1d5db",
    },
  }
}

export function construirDocDashboard(
  institucion: InstitucionHeader,
  datos: DatosDashboardPDF,
): TDocumentDefinitions {
  const { kpis, sinCobertura, reemplazosActivos, fecha } = datos
  const fechaStr = formatFecha(fecha)

  const colorCobertura =
    kpis.clasesHoy === 0
      ? "#6b7280"
      : kpis.coberturaPorcentaje >= 85
      ? "#16a34a"
      : kpis.coberturaPorcentaje >= 70
      ? "#d97706"
      : "#dc2626"

  // ── Sección KPIs ────────────────────────────────────────────────────────
  const seccionKPIs: Cell = {
    table: {
      widths: ["*", "*", "*", "*", "*", "*"],
      body: [
        [
          kpiBox("Cobertura",          `${kpis.coberturaPorcentaje}%`, colorCobertura),
          kpiBox("Clases hoy",         String(kpis.clasesHoy)),
          kpiBox("Reemplazos activos", String(kpis.reemplazosActivos), kpis.reemplazosActivos > 0 ? "#d97706" : undefined),
          kpiBox("Sin cobertura",      String(kpis.sinCoberturaHoy),   kpis.sinCoberturaHoy > 0 ? "#dc2626" : undefined),
          kpiBox("Suspendidas",        String(kpis.suspendidasHoy),    kpis.suspendidasHoy > 0 ? "#d97706" : undefined),
          kpiBox("Incidencias activas",String(kpis.incidenciasActivas),kpis.incidenciasActivas > 0 ? "#6b7280" : undefined),
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 || i === 6 ? 0 : 0.5),
      vLineColor: () => "#e5e7eb",
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 0, 0, 16],
  }

  // ── Sin cobertura ────────────────────────────────────────────────────────
  const filasTabla1: Cell[][] = sinCobertura.map((c, i) => [
    { text: c.unidad ?? "-",        style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: c.comision ?? "-",      style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: c.identificador ?? "-", style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: c.titular,              style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: c.articulo ?? "-",      style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
  ])

  const tablaSinCobertura: Cell =
    sinCobertura.length === 0
      ? tablaVacia(5, "No hay clases sin cobertura hoy ✓")
      : {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "*", "auto"],
            body: [
              [
                { text: "Unidad",        style: "headerTabla" },
                { text: "Comisión",      style: "headerTabla" },
                { text: "Identificador", style: "headerTabla" },
                { text: "Titular",       style: "headerTabla" },
                { text: "Artículo",      style: "headerTabla" },
              ],
              ...filasTabla1,
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#d1d5db",
            vLineColor: () => "#d1d5db",
          },
        }

  // ── Reemplazos activos ───────────────────────────────────────────────────
  const filasTabla2: Cell[][] = reemplazosActivos.map((r, i) => [
    { text: r.unidad ?? "-",        style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: r.comision ?? "-",      style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: r.identificador ?? "-", style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: r.titular,              style: i % 2 === 0 ? "celdaNormal" : "celdaGris" },
    { text: r.suplente,             style: i % 2 === 0 ? "celdaDestacada" : "celdaDestacada" },
  ])

  const tablaReemplazos: Cell =
    reemplazosActivos.length === 0
      ? tablaVacia(5, "No hay reemplazos activos hoy")
      : {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "*", "*"],
            body: [
              [
                { text: "Unidad",        style: "headerTabla" },
                { text: "Comisión",      style: "headerTabla" },
                { text: "Identificador", style: "headerTabla" },
                { text: "Titular",       style: "headerTabla" },
                { text: "Suplente",      style: "headerTabla" },
              ],
              ...filasTabla2,
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#d1d5db",
            vLineColor: () => "#d1d5db",
          },
        }

  // ── Documento final ──────────────────────────────────────────────────────
  const content: Cell[] = [
    ...headerReporte(
      institucion,
      "Estado Operativo Institucional",
      `Generado el ${fechaStr}`,
      fecha,
    ),
    seccionKPIs,
    { text: "Clases sin cobertura hoy", style: "subtitulo", margin: [0, 0, 0, 6] },
    tablaSinCobertura,
    { text: "Reemplazos activos hoy", style: "subtitulo", margin: [0, 16, 0, 6] },
    tablaReemplazos,
    {
      text: `Documento generado automáticamente por ALNEXT · ${fechaStr}`,
      style: "nota",
      alignment: "center",
      margin: [0, 20, 0, 0],
    },
  ]

  return {
    pageSize:    "A4",
    pageMargins: [30, 30, 30, 30],
    content,
    styles:      estilosBase,
    defaultStyle: { font: "Roboto" },
  }
}
