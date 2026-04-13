import prisma from "@/lib/prisma"

export const institucionRepository = {

  listar() {
    return prisma.institucion.findMany({
      where:   { deletedAt: null, activo: true },
      orderBy: { id: "asc" },
      select: {
        id:       true,
        nombre:   true,
        dominio:  true,
        email:    true,
        telefono: true,
      },
    })
  },

  verificarSesionSuperAdmin(token: string) {
    return prisma.sesion.findUnique({
      where:  { token },
      select: {
        expiresAt: true,
        usuario: { select: { esSuperAdmin: true } },
      },
    })
  },

  crear(data: {
    nombre:    string
    dominio:   string
    domicilio?: string
    telefono?:  string
    email?:     string
    cuit?:      string
  }) {
    return prisma.institucion.create({
      data,
      select: {
        id:        true,
        nombre:    true,
        dominio:   true,
        email:     true,
        telefono:  true,
        domicilio: true,
        cuit:      true,
        estado:    true,
        createdAt: true,
      },
    })
  },
}