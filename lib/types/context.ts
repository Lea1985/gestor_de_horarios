// lib/types/context.ts
// Tipo compartido para el contexto de request autenticado.
// Cualquier handler que use withContext recibe este objeto.

export type RequestContext = {
  usuarioId: number
  tenantId: number
}