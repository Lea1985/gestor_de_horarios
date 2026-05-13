// lib/usecases/agentes/listarAgentes.ts
import { agenteRepository } from "@/lib/repositories/agenteRepository"

export async function listarAgentes(tenantId: number, incluirInactivos = false) {
  return agenteRepository.listar(tenantId, incluirInactivos)
}