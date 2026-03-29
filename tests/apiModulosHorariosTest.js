// apiModulosHorariosTest.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const baseUrl = "http://localhost:3000/api/distribucionesModulos";
const distribucionesUrl = "http://localhost:3000/api/distribuciones";
const asignacionesUrl = "http://localhost:3000/api/asignaciones";
const agentesUrl = "http://localhost:3000/api/agentes";
const unidadesUrl = "http://localhost:3000/api/unidades";
const modulosUrl = "http://localhost:3000/api/modulosHorarios";

const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let result = { pasos: {} };

let moduloId, asignacionId, distribucionId, agenteId, unidadId;

try {
  const random = Date.now();
  const safeNumber = random % 1000000;
  const horaDesde = Math.floor(Math.random() * 23);
  const horaHasta = horaDesde + 1;

  // ================================
  // 🔹 AGENTE
  // ================================
  const agenteRes = await fetch(agentesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: "AgenteTest",
      apellido: "Modulo",
      documento: String(random),
      email: `test${random}@mail.com`
    })
  });
  if (!agenteRes.ok) throw new Error(await agenteRes.text());
  const agenteData = await agenteRes.json();
  agenteId = agenteData.agente?.id ?? agenteData.id;

  // ================================
  // 🔹 UNIDAD
  // ================================
  const unidadRes = await fetch(unidadesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: "Unidad Test " + random,
      codigoUnidad: safeNumber,
      tipo: "AULA"
    })
  });
  if (!unidadRes.ok) throw new Error(await unidadRes.text());
  unidadId = (await unidadRes.json()).id;

  // ================================
  // 🔹 ASIGNACIÓN
  // ================================
  const asignacionRes = await fetch(asignacionesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: "ASIG_" + random,
      fecha_inicio: new Date().toISOString()
    })
  });
  if (!asignacionRes.ok) throw new Error(await asignacionRes.text());
  asignacionId = (await asignacionRes.json()).id;

  // ================================
  // 🔹 DISTRIBUCIÓN
  // ================================
  const distribucionRes = await fetch(distribucionesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      asignacionId,
      version: safeNumber,
      fecha_vigencia_desde: new Date().toISOString()
    })
  });
  if (!distribucionRes.ok) throw new Error(await distribucionRes.text());
  distribucionId = (await distribucionRes.json()).id;
  console.log("Distribución ID:", distribucionId);

  // ================================
  // 🔹 MÓDULO (idempotente)
  // ================================
  const moduloRes = await fetch(modulosUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      dia_semana: "LUNES",
      hora_desde: horaDesde,
      hora_hasta: horaHasta
    })
  });

  const moduloData = await moduloRes.json();

  if (moduloRes.status === 409) {
    if (!moduloData?.modulo?.id) throw new Error("409 sin entidad: " + JSON.stringify(moduloData));
    moduloId = moduloData.modulo.id;
    console.log("Módulo ID:", moduloId, "(reutilizado)");
  } else if (!moduloRes.ok) {
    throw new Error(JSON.stringify(moduloData));
  } else {
    if (!moduloData?.id) throw new Error("Módulo no devolvió ID");
    moduloId = moduloData.id;
    console.log("Módulo ID:", moduloId, "(nuevo)");
  }

  // ================================
  // 🔹 RELACIÓN
  // ================================
  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      moduloHorarioId: moduloId
    })
  });
  const created = await createRes.json();
  result.pasos.create = created.distribucionHorariaId === distribucionId ? "✅" : "❌";

  // ================================
  // 🔹 DUPLICADO
  // ================================
  const duplicateRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      moduloHorarioId: moduloId
    })
  });
  result.pasos.duplicado = duplicateRes.status === 409 ? "✅" : "❌";

  // ================================
  // 🔹 DELETE DISTRIBUCIÓN
  // ================================
  const deleteDistRes = await fetch(`${distribucionesUrl}/${distribucionId}`, {
    method: "DELETE",
    headers: tenantHeader
  });
  const deleteDist = await deleteDistRes.json();
  result.pasos.delete = deleteDist.ok ? "✅" : "❌";

  // ================================
  // 🔹 SOFT DELETE MÓDULO
  // ================================
  await fetch(`${modulosUrl}/${moduloId}`, {
    method: "DELETE",
    headers: tenantHeader
  });

  const moduloDB = await prisma.moduloHorario.findUnique({
    where: { id: moduloId }
  });
  result.pasos.softDelete = moduloDB && moduloDB.deletedAt !== null ? "✅" : "❌";

} catch (err) {
  console.error("❌ Error general en test:", err.message);

} finally {
  console.log("\n🧹 Iniciando cleanup...");

  try {
    if (moduloId) {
      await prisma.distribucionModulo.deleteMany({ where: { moduloHorarioId: moduloId } });
      await prisma.moduloHorario.deleteMany({ where: { id: moduloId } });
    }
    if (distribucionId) {
      await prisma.distribucionHoraria.deleteMany({ where: { id: distribucionId } });
    }
    if (asignacionId) {
      await prisma.asignacion.deleteMany({ where: { id: asignacionId } });
    }
    if (unidadId) {
      await prisma.unidadOrganizativa.deleteMany({ where: { id: unidadId } });
    }
    if (agenteId) {
      await prisma.agenteInstitucion.deleteMany({ where: { agenteId } });
      await prisma.agente.deleteMany({ where: { id: agenteId } });
    }
    console.log("✅ Cleanup completo");
  } catch (cleanupError) {
    console.error("❌ Error en cleanup:", cleanupError.message);
  }

  await prisma.$disconnect();
}

console.table(result.pasos);