// /api/instituciones/route.ts
import prisma from "@/lib/prisma";

export async function GET() {
  const instituciones = await prisma.institucion.findMany();
  return Response.json(instituciones);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { nombre, domicilio, telefono, email } = body;

  if (!nombre || nombre.trim() === "") {
    return Response.json({ error: "Nombre es obligatorio" }, { status: 400 });
  }

  const nueva = await prisma.institucion.create({
    data: { nombre: nombre.trim(), domicilio, telefono, email },
  });

  return Response.json(nueva, { status: 201 });
}