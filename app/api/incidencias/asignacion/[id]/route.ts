import prisma from "@/lib/prisma"
import { withTenant } from "@/lib/tenant/withTenant"

export async function GET(req: Request, context: any) {
  return withTenant(async (tenantId) => {

    const params = await context.params; // 🔥 CLAVE
    const asignacionId = Number(params.id);

    if (!asignacionId || isNaN(asignacionId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400 }
      );
    }

    const items = await prisma.incidencia.findMany({
      where: {
        asignacionId,
        activo: true,
        deletedAt: null,
        asignacion: {
          institucionId: tenantId
        }
      },
      orderBy: {
        fecha_desde: "desc"
      }
    });

    return Response.json(items);

  }, req);
}