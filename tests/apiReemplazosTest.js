// tests/apiReemplazosTest.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const baseUrl = "http://localhost:3000/api";
const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let result = { pasos: {} };

// IDs para cleanup
let agenteId, agenteSuId, unidadId, unidadSuId;
let asignacionId, asignacionSuId;
let distribucionId, moduloId, claseId, reemplazoId;

try {
  const random = Date.now();
  const safeNumber = random % 1000000;

  // ================================
  // 🔹 INFRAESTRUCTURA TITULAR
  // ================================
  const agenteRes = await fetch(`${baseUrl}/agentes`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      nombre: "Titular", apellido: "Reemplazo",
      documento: String(random), email: `titular${random}@test.com`
    })
  });
  if (!agenteRes.ok) throw new Error("Error creando agente titular");
  agenteId = (await agenteRes.json()).agente?.id;

  const unidadRes = await fetch(`${baseUrl}/unidades`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ nombre: "Unidad Titular " + random, codigoUnidad: safeNumber, tipo: "AULA" })
  });
  if (!unidadRes.ok) throw new Error("Error creando unidad titular");
  unidadId = (await unidadRes.json()).id;

  const asignacionRes = await fetch(`${baseUrl}/asignaciones`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      agenteId, unidadId,
      identificadorEstructural: "TITULAR_" + random,
      fecha_inicio: new Date().toISOString()
    })
  });
  if (!asignacionRes.ok) throw new Error("Error creando asignación titular");
  asignacionId = (await asignacionRes.json()).id;

  // ================================
  // 🔹 INFRAESTRUCTURA SUPLENTE
  // ================================
  const agenteSuRes = await fetch(`${baseUrl}/agentes`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      nombre: "Suplente", apellido: "Reemplazo",
      documento: String(random + 1), email: `suplente${random}@test.com`
    })
  });
  if (!agenteSuRes.ok) throw new Error("Error creando agente suplente");
  agenteSuId = (await agenteSuRes.json()).agente?.id;

  const unidadSuRes = await fetch(`${baseUrl}/unidades`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ nombre: "Unidad Suplente " + random, codigoUnidad: safeNumber + 1, tipo: "AULA" })
  });
  if (!unidadSuRes.ok) throw new Error("Error creando unidad suplente");
  unidadSuId = (await unidadSuRes.json()).id;

  const asignacionSuRes = await fetch(`${baseUrl}/asignaciones`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      agenteId: agenteSuId, unidadId: unidadSuId,
      identificadorEstructural: "SUPLENTE_" + random,
      fecha_inicio: new Date().toISOString()
    })
  });
  if (!asignacionSuRes.ok) throw new Error("Error creando asignación suplente");
  asignacionSuId = (await asignacionSuRes.json()).id;

  // ================================
  // 🔹 DISTRIBUCIÓN + MÓDULO + CLASE
  // ================================
  const distribucionRes = await fetch(`${baseUrl}/distribuciones`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      asignacionId,
      version: safeNumber,
      fecha_vigencia_desde: "2026-01-01T00:00:00.000Z"
    })
  });
  if (!distribucionRes.ok) throw new Error("Error creando distribución");
  distribucionId = (await distribucionRes.json()).id;

  const horaDesde = Math.floor(Math.random() * 20);
  const moduloRes = await fetch(`${baseUrl}/modulosHorarios`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ dia_semana: "MARTES", hora_desde: horaDesde, hora_hasta: horaDesde + 1 })
  });
  const moduloData = await moduloRes.json();
  if (moduloRes.status === 409) {
    moduloId = moduloData?.modulo?.id;
  } else if (!moduloRes.ok) {
    throw new Error("Error creando módulo");
  } else {
    moduloId = moduloData.id;
  }

  await fetch(`${baseUrl}/distribucionesModulos`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ distribucionHorariaId: distribucionId, moduloHorarioId: moduloId })
  });

  const generarRes = await fetch(`${baseUrl}/clases/generar`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      fecha_desde: "2026-04-01",
      fecha_hasta: "2026-04-30"
    })
  });
  if (!generarRes.ok) throw new Error("Error generando clases");

  // Obtener primera clase generada
  const clasesRes = await fetch(
    `${baseUrl}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
    { headers: tenantHeader }
  );
  const clases = await clasesRes.json();
  claseId = clases[0]?.id;
  if (!claseId) throw new Error("No se encontró ninguna clase generada");
  console.log("Clase ID:", claseId);

  // ================================
  // 🔹 CREATE REEMPLAZO
  // ================================
  const createRes = await fetch(`${baseUrl}/reemplazos`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      claseId,
      asignacionTitularId:  asignacionId,
      asignacionSuplenteId: asignacionSuId,
      observacion: "Reemplazo de prueba"
    })
  });
  if (!createRes.ok) throw new Error("Error creando reemplazo: " + await createRes.text());
  const reemplazo = await createRes.json();
  reemplazoId = reemplazo.id;
  result.pasos.create = reemplazoId ? "✅" : "❌";

  // Verificar que la clase quedó en REEMPLAZADA
  const claseReemplazada = await fetch(`${baseUrl}/clases/${claseId}`, { headers: tenantHeader });
  const claseData = await claseReemplazada.json();
  result.pasos.claseReemplazada = claseData.estado === "REEMPLAZADA" ? "✅" : "❌";

  // ================================
  // 🔹 DUPLICADO — misma clase → 409
  // ================================
  const dupRes = await fetch(`${baseUrl}/reemplazos`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      claseId,
      asignacionTitularId:  asignacionId,
      asignacionSuplenteId: asignacionSuId
    })
  });
  result.pasos.duplicado = dupRes.status === 409 ? "✅" : "❌";

  // ================================
  // 🔹 MISMO TITULAR Y SUPLENTE → 400
  // ================================
  const mismoRes = await fetch(`${baseUrl}/reemplazos`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      claseId,
      asignacionTitularId:  asignacionId,
      asignacionSuplenteId: asignacionId  // mismo
    })
  });
  result.pasos.mismoTitularSuplente = mismoRes.status === 400 ? "✅" : "❌";

  // ================================
  // 🔹 GET BY ID
  // ================================
  const getRes = await fetch(`${baseUrl}/reemplazos/${reemplazoId}`, { headers: tenantHeader });
  const getData = await getRes.json();
  result.pasos.getById = getRes.ok && getData.id === reemplazoId ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL por claseId
  // ================================
  const getAllRes = await fetch(`${baseUrl}/reemplazos?claseId=${claseId}`, { headers: tenantHeader });
  const getAllData = await getAllRes.json();
  result.pasos.getAllClaseId = Array.isArray(getAllData) && getAllData.length > 0 ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL por asignacion titular
  // ================================
  const getAllTitularRes = await fetch(
    `${baseUrl}/reemplazos?asignacionTitularId=${asignacionId}`,
    { headers: tenantHeader }
  );
  const getAllTitularData = await getAllTitularRes.json();
  result.pasos.getAllTitular = Array.isArray(getAllTitularData) && getAllTitularData.length > 0 ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL por asignacion suplente
  // ================================
  const getAllSuplenteRes = await fetch(
    `${baseUrl}/reemplazos?asignacionSuplenteId=${asignacionSuId}`,
    { headers: tenantHeader }
  );
  const getAllSuplenteData = await getAllSuplenteRes.json();
  result.pasos.getAllSuplente = Array.isArray(getAllSuplenteData) && getAllSuplenteData.length > 0 ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL por rango de fechas
  // ================================
  const getAllFechaRes = await fetch(
    `${baseUrl}/reemplazos?fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
    { headers: tenantHeader }
  );
  const getAllFechaData = await getAllFechaRes.json();
  result.pasos.getAllFecha = Array.isArray(getAllFechaData) ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL sin filtros → 400
  // ================================
  const getAllSinFiltrosRes = await fetch(`${baseUrl}/reemplazos`, { headers: tenantHeader });
  result.pasos.getAllSinFiltros = getAllSinFiltrosRes.status === 400 ? "✅" : "❌";

  // ================================
  // 🔹 GET inexistente → 404
  // ================================
  const getInexistenteRes = await fetch(`${baseUrl}/reemplazos/999999`, { headers: tenantHeader });
  result.pasos.getInexistente = getInexistenteRes.status === 404 ? "✅" : "❌";

  // ================================
  // 🔹 DELETE (soft) — revierte clase a PROGRAMADA
  // ================================
  const deleteRes = await fetch(`${baseUrl}/reemplazos/${reemplazoId}`, {
    method: "DELETE", headers: tenantHeader
  });
  const deleteData = await deleteRes.json();
  result.pasos.delete = deleteData.ok && deleteData.deleted ? "✅" : "❌";

  // Verificar que la clase volvió a PROGRAMADA
  const claseRevertida = await fetch(`${baseUrl}/clases/${claseId}`, { headers: tenantHeader });
  const claseRevertidaData = await claseRevertida.json();
  result.pasos.claseRevertida = claseRevertidaData.estado === "PROGRAMADA" ? "✅" : "❌";

  // ================================
  // 🔹 GET después de delete → 404
  // ================================
  const getDeletedRes = await fetch(`${baseUrl}/reemplazos/${reemplazoId}`, { headers: tenantHeader });
  result.pasos.getDeleted = getDeletedRes.status === 404 ? "✅" : "❌";

} catch (err) {
  console.error("❌ Error general en test:", err.message);

} finally {
  console.log("\n🧹 Iniciando cleanup...");

  try {
    if (asignacionId) {
      await prisma.reemplazo.deleteMany({ where: { asignacionTitularId: asignacionId } });
      await prisma.reemplazo.deleteMany({ where: { asignacionSuplenteId: asignacionSuId } });
      await prisma.claseProgramada.deleteMany({ where: { asignacionId } });
      await prisma.distribucionModulo.deleteMany({ where: { distribucionHorariaId: distribucionId } });
      await prisma.distribucionHoraria.deleteMany({ where: { id: distribucionId } });
      await prisma.asignacion.deleteMany({ where: { id: asignacionId } });
    }
    if (asignacionSuId) {
      await prisma.asignacion.deleteMany({ where: { id: asignacionSuId } });
    }
    if (unidadId)   await prisma.unidadOrganizativa.deleteMany({ where: { id: unidadId } });
    if (unidadSuId) await prisma.unidadOrganizativa.deleteMany({ where: { id: unidadSuId } });
    if (agenteId) {
      await prisma.agenteInstitucion.deleteMany({ where: { agenteId } });
      await prisma.agente.deleteMany({ where: { id: agenteId } });
    }
    if (agenteSuId) {
      await prisma.agenteInstitucion.deleteMany({ where: { agenteId: agenteSuId } });
      await prisma.agente.deleteMany({ where: { id: agenteSuId } });
    }
    console.log("✅ Cleanup completo");
  } catch (cleanupError) {
    console.error("❌ Error en cleanup:", cleanupError.message);
  }

  await prisma.$disconnect();
}

console.log("\n📊 RESULTADOS\n");
console.table(result.pasos);