// tests/apiClasesTest.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const baseUrl = "http://localhost:3000/api";
const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let result = { pasos: {} };

// IDs para cleanup
let agenteId, unidadId, asignacionId, distribucionId, moduloId, claseId;

// ── helper ────────────────────────────────────────────────
async function postOrFetch(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.status === 409) return { data: data.modulo ?? data.distribucion ?? data, reutilizado: true };
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}: ${JSON.stringify(data)}`);
  return { data, reutilizado: false };
}

try {
  const random = Date.now();
  const safeNumber = random % 1000000;

  // ================================
  // 🔹 INFRAESTRUCTURA
  // ================================

  // AGENTE
  const agenteRes = await fetch(`${baseUrl}/agentes`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      nombre: "Agente", apellido: "ClaseTest",
      documento: String(random), email: `clase${random}@test.com`
    })
  });
  if (!agenteRes.ok) throw new Error("Error creando agente");
  const agenteData = await agenteRes.json();
  agenteId = agenteData.agente?.id ?? agenteData.id;

  // UNIDAD
  const unidadRes = await fetch(`${baseUrl}/unidades`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ nombre: "Unidad ClaseTest " + random, codigoUnidad: safeNumber, tipo: "AULA" })
  });
  if (!unidadRes.ok) throw new Error("Error creando unidad");
  unidadId = (await unidadRes.json()).id;

  // ASIGNACION
  const asignacionRes = await fetch(`${baseUrl}/asignaciones`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      agenteId, unidadId,
      identificadorEstructural: "CLASE_TEST_" + random,
      fecha_inicio: new Date().toISOString()
    })
  });
  if (!asignacionRes.ok) throw new Error("Error creando asignación");
  asignacionId = (await asignacionRes.json()).id;

  // DISTRIBUCION
  const distribucionRes = await fetch(`${baseUrl}/distribuciones`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      asignacionId,
      version: safeNumber,
      fecha_vigencia_desde: "2026-01-01T00:00:00.000Z"
      // sin fecha_vigencia_hasta → vigencia permanente
    })
  });
  if (!distribucionRes.ok) throw new Error("Error creando distribución");
  distribucionId = (await distribucionRes.json()).id;
  console.log("Distribución ID:", distribucionId);

  // MODULO (idempotente)
  const horaDesde = Math.floor(Math.random() * 20);
  const moduloRes = await fetch(`${baseUrl}/modulosHorarios`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ dia_semana: "LUNES", hora_desde: horaDesde, hora_hasta: horaDesde + 1 })
  });
  const moduloData = await moduloRes.json();
  if (moduloRes.status === 409) {
    if (!moduloData?.modulo?.id) throw new Error("409 sin entidad: " + JSON.stringify(moduloData));
    moduloId = moduloData.modulo.id;
    console.log("Módulo ID:", moduloId, "(reutilizado)");
  } else if (!moduloRes.ok) {
    throw new Error("Error creando módulo");
  } else {
    moduloId = moduloData.id;
    console.log("Módulo ID:", moduloId, "(nuevo)");
  }

  // VINCULAR MODULO A DISTRIBUCION
  const vinculoRes = await fetch(`${baseUrl}/distribucionesModulos`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({ distribucionHorariaId: distribucionId, moduloHorarioId: moduloId })
  });
  if (!vinculoRes.ok && vinculoRes.status !== 409) {
    throw new Error("Error vinculando módulo a distribución");
  }
  console.log("Módulo vinculado a distribución", vinculoRes.status === 409 ? "(ya existía)" : "(nuevo)");

  // ================================
  // 🔹 GENERAR CLASES
  // ================================

  const generarRes = await fetch(`${baseUrl}/clases/generar`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      fecha_desde: "2026-04-01",
      fecha_hasta: "2026-04-30"
    })
  });
  if (!generarRes.ok) throw new Error("Error generando clases: " + await generarRes.text());
  const generarData = await generarRes.json();
  console.log("Clases generadas:", generarData);
  result.pasos.generar = generarData.ok && generarData.creadas >= 0 ? "✅" : "❌";

  // ================================
  // 🔹 IDEMPOTENCIA — generar de nuevo el mismo rango
  // ================================
  const generarDe2 = await fetch(`${baseUrl}/clases/generar`, {
    method: "POST", headers: tenantHeader,
    body: JSON.stringify({
      distribucionHorariaId: distribucionId,
      fecha_desde: "2026-04-01",
      fecha_hasta: "2026-04-30"
    })
  });
  const generarData2 = await generarDe2.json();
  result.pasos.generarIdempotente = (
    generarData2.ok &&
    generarData2.creadas === 0 &&
    generarData2.omitidas === generarData.creadas
  ) ? "✅" : "❌";

  // ================================
  // 🔹 GET ALL con filtros
  // ================================
  const getAllRes = await fetch(
    `${baseUrl}/clases?asignacionId=${asignacionId}&fecha_desde=2026-04-01&fecha_hasta=2026-04-30`,
    { headers: tenantHeader }
  );
  const clases = await getAllRes.json();
  result.pasos.getAll = Array.isArray(clases) && clases.length === generarData.creadas ? "✅" : "❌";

  // Guardar primera clase para los siguientes tests
  claseId = clases[0]?.id;
  if (!claseId) throw new Error("No se encontró ninguna clase generada");

  // ================================
  // 🔹 GET ALL sin filtros → debe dar 400
  // ================================
  const getAllSinFiltros = await fetch(`${baseUrl}/clases`, { headers: tenantHeader });
  result.pasos.getAllSinFiltros = getAllSinFiltros.status === 400 ? "✅" : "❌";

  // ================================
  // 🔹 GET BY ID
  // ================================
  const getByIdRes = await fetch(`${baseUrl}/clases/${claseId}`, { headers: tenantHeader });
  const clase = await getByIdRes.json();
  result.pasos.getById = getByIdRes.ok && clase.id === claseId ? "✅" : "❌";

  // ================================
  // 🔹 PATCH — cambiar estado a DICTADA
  // ================================
  const patchRes = await fetch(`${baseUrl}/clases/${claseId}`, {
    method: "PATCH", headers: tenantHeader,
    body: JSON.stringify({ estado: "DICTADA" })
  });
  const patchData = await patchRes.json();
  result.pasos.patchEstado = patchRes.ok && patchData.estado === "DICTADA" ? "✅" : "❌";

  // ================================
  // 🔹 PATCH — estado inválido → debe dar 400
  // ================================
  const patchInvalidoRes = await fetch(`${baseUrl}/clases/${claseId}`, {
    method: "PATCH", headers: tenantHeader,
    body: JSON.stringify({ estado: "INEXISTENTE" })
  });
  result.pasos.patchEstadoInvalido = patchInvalidoRes.status === 400 ? "✅" : "❌";

  // ================================
  // 🔹 PATCH — sin body → debe dar 400
  // ================================
  const patchVacioRes = await fetch(`${baseUrl}/clases/${claseId}`, {
    method: "PATCH", headers: tenantHeader,
    body: JSON.stringify({})
  });
  result.pasos.patchVacio = patchVacioRes.status === 400 ? "✅" : "❌";

  // ================================
  // 🔹 GET BY ID inexistente → debe dar 404
  // ================================
  const getInexistenteRes = await fetch(`${baseUrl}/clases/999999`, { headers: tenantHeader });
  result.pasos.getInexistente = getInexistenteRes.status === 404 ? "✅" : "❌";

} catch (err) {
  console.error("❌ Error general en test:", err.message);

} finally {
  console.log("\n🧹 Iniciando cleanup...");

  try {
    if (asignacionId) {
      await prisma.reemplazo.deleteMany({
        where: { clase: { asignacionId } }
      });
      await prisma.claseProgramada.deleteMany({ where: { asignacionId } });
    }

    if (distribucionId) {
      await prisma.distribucionModulo.deleteMany({ where: { distribucionHorariaId: distribucionId } });
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

console.log("\n📊 RESULTADOS\n");
console.table(result.pasos);