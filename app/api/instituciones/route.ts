// app/api/instituciones/route.js

export async function GET() {
  return Response.json([
    { id: 2, nombre: "Institucón de ejemplo" }
  ]);
}