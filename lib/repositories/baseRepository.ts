// lib/repositories/baseRepository.ts

type Where = Record<string, any>

export function withTenant<T extends Where>(
  where: T,
  tenantId: number
): T & { institucionId: number; deletedAt: null } {
  return {
    ...where,
    institucionId: tenantId,
    deletedAt: null,
  }
}

export async function safeUpdate<T>(
  model: any,
  where: Where,
  tenantId: number,
  data: any,
  include?: T
) {
  const result = await model.updateMany({
    where: withTenant(where, tenantId),
    data,
  })

  if (result.count === 0) {
    throw new Error("No encontrado o no autorizado")
  }

  // opcional: devolver el registro actualizado
  return model.findFirst({
    where: withTenant(where, tenantId),
    include,
  })
}

export async function safeSoftDelete(
  model: any,
  where: Where,
  tenantId: number
) {
  const result = await model.updateMany({
    where: withTenant(where, tenantId),
    data: {
      deletedAt: new Date(),
      activo: false,
    },
  })

  if (result.count === 0) {
    throw new Error("No encontrado o no autorizado")
  }

  return { ok: true }
}