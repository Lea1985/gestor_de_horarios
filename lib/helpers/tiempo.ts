//lib/helpers/tiempo.ts
export function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60

  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}