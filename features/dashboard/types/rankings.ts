// features/dashboard/types/rankings.ts

export type RangoRankings = "todo" | "anio" | "semestre" | "mes"

export interface RankingItem {
  id:    number
  label: string
  sub?:  string
  total: number
}

export interface RankingsData {
  agentesConMasLicencias:    RankingItem[]
  articulosMasUsados:        RankingItem[]
  comisionesConMasAusencias: RankingItem[]
  periodo: { desde: string | null; hasta: string | null }
}
