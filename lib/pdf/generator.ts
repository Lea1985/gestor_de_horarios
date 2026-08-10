// lib/pdf/generator.ts
// Generador base de PDFs usando pdfmake (API 8.x: instancia exportada
// directamente, fuentes vía propiedad .fonts, createPdf().getBuffer())

// @ts-expect-error - pdfmake/js/index.js no tiene declaraciones de tipos
import pdfMake from "pdfmake/js/index.js"
import type { TDocumentDefinitions, StyleDictionary } from "pdfmake/interfaces"
import path from "path"

// Las fuentes estándar PDF (Helvetica, Times, etc.) requieren que pdfkit
// resuelva archivos .afm por ruta relativa, lo cual falla en el entorno
// bundleado de Next.js. Se usan en cambio las fuentes TTF Roboto que
// vienen junto al paquete pdfmake.
//
// IMPORTANTE: la ruta se arma manualmente a partir de process.cwd() en
// vez de usar require.resolve(".../*.ttf"), porque Turbopack intercepta
// cualquier require/import que apunte a un archivo .ttf y trata de
// bundlearlo como módulo (lo cual falla, ya que no es JS). Construyendo
// el path como string en runtime, el bundler nunca lo ve como un import.
function resolverFontsRoboto() {
  const base = path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto")
  return {
    Roboto: {
      normal:      path.join(base, "Roboto-Regular.ttf"),
      bold:        path.join(base, "Roboto-Medium.ttf"),
      italics:     path.join(base, "Roboto-Italic.ttf"),
      bolditalics: path.join(base, "Roboto-MediumItalic.ttf"),
    },
  }
}

const fonts = resolverFontsRoboto()

// pdfmake exporta una instancia única (singleton); las fuentes se
// asignan como propiedad antes de generar cualquier documento.
;(pdfMake as { fonts: typeof fonts }).fonts = fonts

/**
 * Tipo laxo para contenido y celdas de tabla de pdfmake. La unión estricta
 * `Content` de @types/pdfmake es muy difícil de satisfacer al construir
 * documentos dinámicamente (rowSpan, colSpan, columns anidadas, celdas
 * vacías, etc.), así que se usa un tipo permisivo en toda la capa de
 * construcción de reportes. pdfmake valida la estructura en tiempo de
 * ejecución de todos modos.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cell = any

export const estilosBase: StyleDictionary = {
  titulo: {
    fontSize:  16,
    bold:      true,
    color:     "#1a1a2e",
    margin:    [0, 0, 0, 4],
  },
  subtitulo: {
    fontSize:  11,
    bold:      true,
    color:     "#374151",
    margin:    [0, 12, 0, 4],
  },
  headerTabla: {
    fontSize:   8,
    bold:       true,
    color:      "#ffffff",
    fillColor:  "#1e3a5f",
    margin:     [4, 4, 4, 4],
  },
  celdaNormal: {
    fontSize: 8,
    color:    "#1f2937",
    margin:   [4, 3, 4, 3],
  },
  celdaGris: {
    fontSize:  8,
    color:     "#1f2937",
    fillColor: "#f3f4f6",
    margin:    [4, 3, 4, 3],
  },
  celdaDestacada: {
    fontSize:  8,
    bold:      true,
    color:     "#1e3a5f",
    fillColor: "#eff6ff",
    margin:    [4, 3, 4, 3],
  },
  etiqueta: {
    fontSize: 7,
    color:    "#6b7280",
    bold:     true,
  },
  valor: {
    fontSize: 9,
    color:    "#111827",
  },
  nota: {
    fontSize: 7,
    color:    "#6b7280",
    italics:  true,
  },
}

export type InstitucionHeader = {
  nombre:    string
  domicilio: string | null
  telefono:  string | null
  email:     string | null
  cuit:      string | null
}

/**
 * Genera el encabezado estándar de todos los reportes.
 * Incluye nombre de institución, título del reporte y metadatos.
 */
export function headerReporte(
  institucion: InstitucionHeader,
  tituloReporte: string,
  subtitulo?: string,
  fechaGeneracion = new Date()
): Cell[] {
  const fecha = fechaGeneracion.toLocaleDateString("es-AR", {
      day:   "2-digit",
      month: "2-digit",
      year:  "numeric",
      hour:  "2-digit",
      minute:"2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })

  const bloques: Cell[] = [
    {
      columns: [
        {
          stack: [
            { text: institucion.nombre, style: "titulo" },
            ...(institucion.domicilio ? [{ text: institucion.domicilio, style: "nota" }] : []),
            ...(institucion.telefono  ? [{ text: `Tel: ${institucion.telefono}`, style: "nota" }] : []),
          ],
          width: "*",
        },
        {
          stack: [
            { text: fecha, style: "nota", alignment: "right" },
            ...(institucion.cuit ? [{ text: `CUIT: ${institucion.cuit}`, style: "nota", alignment: "right" }] : []),
          ],
          width: "auto",
        },
      ],
      margin: [0, 0, 0, 8],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#1e3a5f" }] },
    { text: tituloReporte, style: "subtitulo", margin: [0, 8, 0, 0] },
  ]

  if (subtitulo) {
    bloques.push({ text: subtitulo, style: "nota", margin: [0, 2, 0, 8] })
  } else {
    bloques.push({ text: "", margin: [0, 0, 0, 8] })
  }

  return bloques
}

/**
 * Genera el PDF y devuelve un Buffer.
 * Usar en los endpoints de API de Next.js.
 */
export async function generarPDFBuffer(
  docDefinition: TDocumentDefinitions
): Promise<Buffer> {
  const documento = pdfMake.createPdf(docDefinition)
  const buffer: Buffer = await documento.getBuffer()
  return buffer
}

/**
 * Devuelve una Response de Next.js con el PDF como descarga.
 */
export async function respuestaPDF(
  docDefinition: TDocumentDefinitions,
  nombreArchivo: string
): Promise<Response> {
  const buffer = await generarPDFBuffer(docDefinition)
  const bytes = new Uint8Array(buffer)
  return new Response(bytes, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length":      buffer.length.toString(),
    },
  })
}

/**
 * Formatea minutos desde medianoche a "HH:MM"
 */
export function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0")
  const m = (minutos % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}

/**
 * Formatea una fecha a "DD/MM/YYYY"
 */
export function formatFecha(fecha: Date | string): string {
  const d = new Date(fecha)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

/**
 * Nombre del día de la semana en español
 */
export const DIAS_ES: Record<string, string> = {
  LUNES:     "Lunes",
  MARTES:    "Martes",
  MIERCOLES: "Miércoles",
  JUEVES:    "Jueves",
  VIERNES:   "Viernes",
  SABADO:    "Sábado",
  DOMINGO:   "Domingo",
}