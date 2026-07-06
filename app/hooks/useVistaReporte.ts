// app/hooks/useVistaReporte.ts
"use client"

import { useState } from "react"
import { useAuth } from "@/app/hooks/useAuth"

/**
 * Hook genérico para cargar la vista en pantalla (JSON) de un reporte,
 * reusando el mismo endpoint que genera el PDF, pero pidiendo formato=json.
 */
export function useVistaReporte<T>() {
  const { authHeaders } = useAuth()
  const [datos, setDatos]       = useState<T | null>(null)
  const [visible, setVisible]   = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function verEnPantalla(url: string) {
    setCargando(true)
    setError(null)
    setVisible(true)
    try {
      const separador = url.includes("?") ? "&" : "?"
      const res = await fetch(`${url}${separador}formato=json`, { headers: authHeaders })

      if (!res.ok) {
        let mensaje = `Error ${res.status} obteniendo los datos`
        try {
          const data = await res.json()
          if (data?.error) mensaje = data.error
        } catch {
          // respuesta no era JSON
        }
        throw new Error(mensaje)
      }

      const data = await res.json()
      setDatos(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando la vista")
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }

  function cerrarVista() {
    setVisible(false)
    setDatos(null)
    setError(null)
  }

  return { datos, visible, cargando, error, verEnPantalla, cerrarVista }
}
