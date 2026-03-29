const baseUrl = "http://localhost:3000/api/incidencias";
const asignacionesUrl = "http://localhost:3000/api/asignaciones";
const agentesUrl = "http://localhost:3000/api/agentes";
const unidadesUrl = "http://localhost:3000/api/unidades";
const codigariosUrl = "http://localhost:3000/api/codigarios";
const institucionesUrl = "http://localhost:3000/api/instituciones";

let result = { pasos: {} };

let institucionId = null;
let agenteId = null;
let unidadId = null;
let asignacionId = null;
let incidenciaId = null;
let childId = null;
let codigarioId = null;

// ================================
// 🧠 HEADERS DINÁMICOS (FIX TENANT)
// ================================
const getHeaders = () => ({
  "x-institucion-id": String(institucionId), // compatibilidad
  "x-tenant-id": String(institucionId),      // ✅ FIX REAL
  "Content-Type": "application/json"
});

// ================================
// 🧠 LOGGER PRO
// ================================
function logStep(step) {
  console.log(`\n🔹 ${step}`);
}

function logOk(msg) {
  console.log(`✅ ${msg}`);
}

function logFail(msg) {
  console.error(`❌ ${msg}`);
}

async function fetchDebug(url, options, label) {
  const start = Date.now();

  try {
    const res = await fetch(url, options);
    const time = Date.now() - start;

    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      logFail(`${label} → JSON inválido`);
      console.error(text);
      throw e;
    }

    if (!res.ok) {
      logFail(`${label} → ${res.status} (${time}ms)`);
      console.error("Response:", data);
      throw new Error(`${label} failed`);
    }

    logOk(`${label} → ${res.status} (${time}ms)`);

    return data;

  } catch (err) {
    logFail(`${label} → ERROR`);
    console.error(err.message);
    throw err;
  }
}

// ================================
// 🚀 TEST
// ================================

(async () => {

console.log("\n🚀 INICIANDO TEST INCIDENCIAS\n");

try {

  // ================================
  // 🏢 INSTITUCIÓN (TENANT DINÁMICO)
  // ================================

  logStep("CREANDO INSTITUCION");

  const institucion = await fetchDebug(institucionesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": "test" // ✅ FIX: middleware safe
    },
    body: JSON.stringify({
      nombre: "Test Inst " + Date.now()
    })
  }, "INSTITUCION CREATE");

  institucionId = institucion?.id;

  if (!institucionId) throw new Error("institucionId undefined");


  // ================================
  // PREPARACIÓN
  // ================================

  logStep("CREANDO AGENTE");

  const agente = await fetchDebug(agentesUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      nombre: "Test",
      apellido: "Incidencia",
      documento: String(Math.floor(Math.random() * 10000000))
    })
  }, "AGENTE CREATE");

  agenteId = agente?.agente?.id || agente?.id;

  if (!agenteId) throw new Error("agenteId undefined");


  logStep("CREANDO UNIDAD");

  const unidad = await fetchDebug(unidadesUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      nombre: "Unidad Test " + Date.now(),
      codigoUnidad: Math.floor(Math.random() * 1000000),
      tipo: "AULA"
    })
  }, "UNIDAD CREATE");

  unidadId = unidad?.id;

  if (!unidadId) throw new Error("unidadId undefined");


  logStep("CREANDO ASIGNACION");

  const asignacion = await fetchDebug(asignacionesUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: "ASIG_" + Date.now(),
      fecha_inicio: new Date().toISOString()
    })
  }, "ASIGNACION CREATE");

  asignacionId = asignacion?.id;

  if (!asignacionId) throw new Error("asignacionId undefined");


  // ================================
  // CODIGARIO + ITEMS
  // ================================

  logStep("CREANDO CODIGARIO");

  const codigarioNombre = "TiposIncidencias_" + Date.now();

  const codigario = await fetchDebug(codigariosUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      nombre: codigarioNombre
    })
  }, "CODIGARIO CREATE");

  codigarioId = codigario?.id;

  if (!codigarioId) throw new Error("codigarioId undefined");


  logStep("CREANDO ITEMS CODIGARIO");

  const itemLicencia = await fetchDebug(`${codigariosUrl}/${codigarioId}/items`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      codigo: "LIC",
      nombre: "LICENCIA"
    })
  }, "ITEM LICENCIA");

  const itemSuspension = await fetchDebug(`${codigariosUrl}/${codigarioId}/items`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      codigo: "SUS",
      nombre: "SUSPENSION"
    })
  }, "ITEM SUSPENSION");

  const itemId = itemLicencia?.id;

  if (!itemId) throw new Error("itemId undefined");


  // ================================
  // CREATE
  // ================================

  logStep("CREANDO INCIDENCIA");

  const desde = new Date();
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + 5);

  const created = await fetchDebug(baseUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      asignacionId,
      fecha_desde: desde.toISOString(),
      fecha_hasta: hasta.toISOString(),
      codigarioItemId: itemId
    })
  }, "INCIDENCIA CREATE");

  incidenciaId = created?.id;

  result.pasos.create = incidenciaId ? "✅" : "❌";


  // ================================
  // SUPERPOSICIÓN (FIX HEADERS)
  // ================================

  logStep("PROBANDO SUPERPOSICIÓN");

  const overlapRes = await fetch(baseUrl, {
    method: "POST",
    headers: getHeaders(), // ✅ FIX
    body: JSON.stringify({
      asignacionId,
      fecha_desde: desde.toISOString(),
      fecha_hasta: hasta.toISOString(),
      codigarioItemId: itemId
    })
  });

  if (overlapRes.status === 409) {
    logOk("SUPERPOSICIÓN detectada correctamente");
    result.pasos.superposicion = "✅";
  } else {
    logFail("SUPERPOSICIÓN no detectada");
    result.pasos.superposicion = "❌";
  }


  // ================================
  // GET
  // ================================

  logStep("GET INCIDENCIA");

  const getData = await fetchDebug(
    `${baseUrl}/${incidenciaId}`,
    { headers: getHeaders() },
    "GET INCIDENCIA"
  );

  result.pasos.getId =
    getData?.id === incidenciaId ? "✅" : "❌";


  // ================================
  // PATCH
  // ================================

  logStep("PATCH INCIDENCIA");

  const nuevaHasta = new Date();
  nuevaHasta.setDate(nuevaHasta.getDate() + 10);

  const patched = await fetchDebug(
    `${baseUrl}/${incidenciaId}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        fecha_hasta: nuevaHasta.toISOString()
      })
    },
    "PATCH INCIDENCIA"
  );

  result.pasos.patch =
    new Date(patched.fecha_hasta).getTime() === nuevaHasta.getTime()
      ? "✅"
      : "❌";


  // ================================
  // CADENA
  // ================================

  logStep("CREANDO HIJA");

  const child = await fetchDebug(baseUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      asignacionId,
      fecha_desde: new Date(nuevaHasta.getTime() + 86400000).toISOString(),
      fecha_hasta: new Date(nuevaHasta.getTime() + 2 * 86400000).toISOString(),
      codigarioItemId: itemSuspension?.id,
      incidenciaPadreId: incidenciaId
    })
  }, "CHILD CREATE");

  childId = child?.id;

  result.pasos.cadenaCreate = childId ? "✅" : "❌";


  logStep("OBTENIENDO CADENA");

  const cadena = await fetchDebug(
    `${baseUrl}/${incidenciaId}/cadena`,
    { headers: getHeaders() },
    "GET CADENA"
  );

  result.pasos.cadena =
    Array.isArray(cadena) && cadena.length >= 2 ? "✅" : "❌";


  // ================================
  // DELETE
  // ================================

  logStep("DELETE INCIDENCIA");

  const deleted = await fetchDebug(
    `${baseUrl}/${incidenciaId}`,
    {
      method: "DELETE",
      headers: getHeaders()
    },
    "DELETE"
  );

  result.pasos.delete = deleted?.ok ? "✅" : "❌";


  // ================================
  // SOFT DELETE
  // ================================

  logStep("CHECK SOFT DELETE");

  const list = await fetchDebug(
    `${baseUrl}/asignacion/${asignacionId}`,
    { headers: getHeaders() },
    "GET ASIGNACION"
  );

  const sigue = list?.find(i => i.id === incidenciaId);

  result.pasos.softDelete = !sigue ? "✅" : "❌";


} catch (err) {
  console.error("\n💥 TEST FALLÓ:\n", err.message);
}

// ================================
// RESULTADOS
// ================================

console.log("\n📊 RESULTADOS\n");
console.table(result.pasos);

// ================================
// CLEANUP
// ================================

console.log("\n🧹 CLEANUP\n");

async function safeDelete(url, label) {
  try {
    await fetch(url, {
      method: "DELETE",
      headers: getHeaders()
    });
    logOk(label);
  } catch {
    logFail(label);
  }
}

if (childId) await safeDelete(`${baseUrl}/${childId}`, "delete child");
if (incidenciaId) await safeDelete(`${baseUrl}/${incidenciaId}`, "delete incidencia");
if (asignacionId) await safeDelete(`${asignacionesUrl}/${asignacionId}`, "delete asignacion");
if (unidadId) await safeDelete(`${unidadesUrl}/${unidadId}`, "delete unidad");
if (agenteId) await safeDelete(`${agentesUrl}/${agenteId}`, "delete agente");

if (codigarioId) await safeDelete(`${codigariosUrl}/${codigarioId}`, "delete codigario");

console.log("\n🏁 FIN TEST\n");

})();