// lib/repositories/authRepository.ts

import prisma from "@/lib/prisma"
import { Estado } from "@prisma/client"

export const authRepository = {

  buscarUsuarioConRol(email: string, institucionId: number) {
    return prisma.usuario.findUnique({
      where: { email },
      select: {
        id:           true,
        email:        true,
        nombre:       true,
        passwordHash: true,
        activo:       true,
        estado:       true,
        roles: {
          where:  { institucionId },
          select: { rolId: true },
        },
      },
    })
  },

  crearSesion(data: {
    token:         string
    usuarioId:     number
    institucionId: number
    expiresAt:     Date
    ip?:           string | null
    userAgent?:    string | null
  }) {
    return prisma.sesion.create({
      data,
      select: { token: true },
    })
  },

  buscarSesion(token: string) {
    return prisma.sesion.findUnique({
      where:  { token },
      select: { usuarioId: true },
    })
  },

  eliminarSesion(token: string) {
    return prisma.sesion.delete({
      where: { token },
    })
  },

  eliminarTodasLasSesiones(usuarioId: number) {
    return prisma.sesion.deleteMany({
      where: { usuarioId },
    })
  },
}