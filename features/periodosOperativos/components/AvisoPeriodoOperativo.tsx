// features/periodosOperativos/components/AvisoPeriodoOperativo.tsx
// UX-PER-001: aviso proactivo de "sin período activo / por vencer" (#81),
// extraído para poder mostrarse tanto en periodos-operativos/page.tsx como
// en el Dashboard principal -- el cierre automático de un período (por
// tráfico, vía withContext.ts) no tiene ningún punto de la UI que lo
// informe hoy; este componente resuelve eso mostrándose en la pantalla
// que el usuario mira primero, no solo en la de Períodos.
"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
type Periodo = {
  id:          number
  nombre:      string
  fecha_desde: string
  fecha_hasta: string
  estado:      "BORRADOR" | "ACTIVO" | "CERRADO"
  deletedAt:   string | null
}
const DIAS_AVISO_VENCIMIENTO = 7
const s = {
  critico: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
    padding: "10px 16px", borderRadius: "var(--radius-xl)",
    background: "#fef2f2", border: "1px solid #fecaca",
    fontSize: "var(--text-xs)", color: "#dc2626",
  },
  advertencia: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
    padding: "10px 16px", borderRadius: "var(--radius-xl)",
    background: "#fffbeb", border: "1px solid #fde68a",
    fontSize: "var(--text-xs)", color: "#d97706",
  },
  link: {
    background: "none", border: "none", fontSize: "var(--text-2xs)", fontWeight: "var(--font-medium)",
    cursor: "pointer", whiteSpace: "nowrap" as const, color: "inherit", textDecoration: "underline",
    flexShrink: 0,
  },
}
type Props = {
  // Si se está renderizando ya dentro de /periodos-operativos, no tiene
  // sentido ofrecer un link a la misma pantalla -- pasar null lo oculta.
  linkDestino?: string | null
  // Incrementalo desde el padre después de una acción que pueda cambiar
  // el estado de los períodos (cerrar, activar, eliminar, restaurar,
  // crear/editar) para forzar un refetch -- este componente tiene su
  // propio fetch interno y si no, se queda con datos viejos (UX-PER, #162).
  refreshSignal?: number
}
export function AvisoPeriodoOperativo({ linkDestino = "/protected/dashboard/periodos-operativos", refreshSignal = 0 }: Props) {
  const { authHeaders } = useAuth()
  const router = useRouter()
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading,  setLoading]  = useState(true)
  useEffect(() => {
    if (authHeaders.Authorization === "Bearer ") return
    fetch("/api/periodos-operativos", { headers: authHeaders, cache: "no-store" })
      .then(res => res.ok ? res.json() : [])
      .then(setPeriodos)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authHeaders.Authorization, refreshSignal])
  const periodoActivo = useMemo(
    () => periodos.find(p => p.estado === "ACTIVO" && !p.deletedAt) ?? null,
    [periodos]
  )
  const diasParaVencer = useMemo(() => {
    if (!periodoActivo) return null
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0)
    const hasta = new Date(periodoActivo.fecha_hasta); hasta.setUTCHours(0, 0, 0, 0)
    return Math.round((hasta.getTime() - hoy.getTime()) / 86_400_000)
  }, [periodoActivo])
  if (loading) return null
  if (!periodoActivo) {
    return (
      <div style={s.critico} role="alert">
        <span>
          <strong>No hay ningún período operativo ACTIVO.</strong> Las clases no se generan ni se
          resuelven, y las incidencias que cargues mientras tanto no van a tener clases asociadas
          hasta que actives uno.
        </span>
        {linkDestino && (
          <button onClick={() => router.push(linkDestino)} style={s.link}>
            Ir a Períodos Operativos →
          </button>
        )}
      </div>
    )
  }
  if (diasParaVencer !== null && diasParaVencer <= DIAS_AVISO_VENCIMIENTO) {
    return (
      <div style={s.advertencia} role="status">
        <span>
          El período &quot;{periodoActivo.nombre}&quot; vence{" "}
          {diasParaVencer < 0
            ? `hace ${Math.abs(diasParaVencer)} día${Math.abs(diasParaVencer) !== 1 ? "s" : ""}`
            : diasParaVencer === 0
            ? "hoy"
            : `en ${diasParaVencer} día${diasParaVencer !== 1 ? "s" : ""}`}
          {" "}({new Date(periodoActivo.fecha_hasta).toLocaleDateString("es-AR", { timeZone: "UTC" })}). Preparate para activar el próximo.
        </span>
        {linkDestino && (
          <button onClick={() => router.push(linkDestino)} style={s.link}>
            Ir a Períodos Operativos →
          </button>
        )}
      </div>
    )
  }
  return null
}