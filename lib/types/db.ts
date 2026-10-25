// lib/types/db.ts
//
// Cliente de base que aceptan las funciones que pueden correr dentro de una
// transacción: el prisma global o el cliente transaccional de
// prisma.$transaction(async (tx) => ...). Por defecto se usa el global.
import type { PrismaClient, Prisma } from "@prisma/client"

export type Db = PrismaClient | Prisma.TransactionClient
