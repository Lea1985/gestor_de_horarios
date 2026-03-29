// /api/mi-institucion/route.ts
import prisma from "@/lib/prisma";
import { withTenant } from "@/lib/tenant/withTenant";

export const GET = (req: Request) =>
  withTenant(async (tenantId) => {
    const institucion = await prisma.institucion.findUnique({
      where: { id: tenantId },
    });
    return Response.json(institucion);
  }, req);

export const PATCH = (req: Request) =>
  withTenant(async (tenantId) => {
    const body = await req.json();
    const data: any = {};

    if (body.nombre) data.nombre = body.nombre;
    if (body.domicilio) data.domicilio = body.domicilio;
    if (body.telefono) data.telefono = body.telefono;
    if (body.configuracion) data.configuracion = body.configuracion;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }

    const institucionActualizada = await prisma.institucion.update({
      where: { id: tenantId },
      data,
    });

    return Response.json(institucionActualizada);
  }, req);