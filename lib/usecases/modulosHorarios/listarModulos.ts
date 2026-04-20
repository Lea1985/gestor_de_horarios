// lib/usecases/modulosHorarios/listarModulos.ts

import { moduloHorarioRepository } from "@/lib/repositories/moduloHorarioRepository"

export async function listarModulos(tenantId: number) {
  return moduloHorarioRepository.listar(tenantId)
}