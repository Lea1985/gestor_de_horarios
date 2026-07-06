// app/hooks/useDescargarPDF.ts
"use client"

import { useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

/**
 * Hook para descargar reportes PDF desde los endpoints /api/reportes/*.
 * Hace fetch con los headers de auth, arma el blob y dispara la descarga
 * directa del archivo (sin abrir pestaña nueva).
 */
export function useDescargarPDF() {
  const { authHeaders } = useAuth()
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function descargar(url: string, nombreSugerido?: string) {
    setDescargando(true)
    setError(null)
    try {
      const res = await fetch(url, { headers: authHeaders })

      if (!res.ok) {
        let mensaje = `Error ${res.status} generando el reporte`
        try {
          const data = await res.json()
          if (data?.error) mensaje = data.error
        } catch {
          // respuesta no era JSON, se mantiene el mensaje genérico
        }
        throw new Error(mensaje)
      }

      const blob = await res.blob()

      // Intentar tomar el nombre de archivo sugerido por el servidor
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="(.+)"/)
      const nombreArchivo = match?.[1] ?? nombreSugerido ?? "reporte.pdf"

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error descargando el reporte")
    } finally {
      setDescargando(false)
    }
  }

  return { descargar, descargando, error, setError }
}