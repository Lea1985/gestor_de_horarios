import prisma from "@/lib/prisma"
import { headers } from "next/headers"

export async function getSession() {

  const headerList = await headers()

  const authHeader = headerList.get("authorization")

  if (!authHeader) {
    return null
  }

  const token = authHeader.replace("Bearer ", "")

  if (!token) {
    return null
  }

  const sesion = await prisma.sesion.findUnique({
    where: { token }
  })

  if (!sesion) {
    return null
  }

  if (sesion.expiresAt < new Date()) {
    return null
  }

  return sesion
}