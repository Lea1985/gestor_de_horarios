
// lib/usecases/instituciones/listarInstituciones.ts
import { institucionRepository } from "@/lib/repositories/institucionRepository"

export async function listarInstituciones() {
  return institucionRepository.listar()
}