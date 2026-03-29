const baseUrl = "http://localhost:3000/api/codigarios";

const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let result = { pasos: {} };

let codigarioId = null;
let itemId = null;
let itemId2 = null;

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

(async () => {

console.log("\n🚀 INICIANDO TEST CODIGARIOS\n");

try {

  // ================================
  // CREATE CODIGARIO
  // ================================

  logStep("CREANDO CODIGARIO");

  const nombreCodigario = "Codigario Test " + Date.now(); // 👈 guardado en variable

  const codigario = await fetchDebug(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: nombreCodigario,
      descripcion: "Test " + Date.now()
    })
  }, "CODIGARIO CREATE");

  codigarioId = codigario?.id;
  result.pasos.createCodigario = codigarioId ? "✅" : "❌";


  // ================================
  // DUPLICADO CODIGARIO
  // ================================

  logStep("PROBANDO DUPLICADO CODIGARIO");

  const dupRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: nombreCodigario // 👈 mismo nombre = conflicto real
    })
  });

  result.pasos.duplicadoCodigario = dupRes.status === 409 ? "✅" : "❌";


  // ================================
  // CREATE ITEM
  // ================================

  logStep("CREANDO ITEM");

  const item = await fetchDebug(
    `${baseUrl}/${codigarioId}/items`,
    {
      method: "POST",
      headers: tenantHeader,
      body: JSON.stringify({
        codigo: "ART_" + Date.now(),
        nombre: "Licencia test",
        descripcion: "Item test"
      })
    },
    "ITEM CREATE"
  );

  itemId = item?.id;
  result.pasos.createItem = itemId ? "✅" : "❌";


  // ================================
  // DUPLICADO ITEM
  // ================================

  logStep("PROBANDO DUPLICADO ITEM");

  const dupItemRes = await fetch(
    `${baseUrl}/${codigarioId}/items`,
    {
      method: "POST",
      headers: tenantHeader,
      body: JSON.stringify({
        codigo: item.codigo,
        nombre: "Duplicado"
      })
    }
  );

  result.pasos.duplicadoItem = dupItemRes.status === 409 ? "✅" : "❌";


  // ================================
  // GET ITEMS
  // ================================

  logStep("GET ITEMS");

  const items = await fetchDebug(
    `${baseUrl}/${codigarioId}/items`,
    { headers: tenantHeader },
    "GET ITEMS"
  );

  result.pasos.getItems = Array.isArray(items) && items.length > 0 ? "✅" : "❌";


  // ================================
  // PATCH ITEM
  // ================================

  logStep("PATCH ITEM");

  const patched = await fetchDebug(
    `${baseUrl}/${codigarioId}/items/${itemId}`,
    {
      method: "PATCH",
      headers: tenantHeader,
      body: JSON.stringify({
        nombre: "Licencia modificada"
      })
    },
    "PATCH ITEM"
  );

  result.pasos.patchItem = patched?.nombre === "Licencia modificada" ? "✅" : "❌";


  // ================================
  // CREATE SEGUNDO ITEM
  // ================================

  logStep("CREANDO SEGUNDO ITEM");

  const item2 = await fetchDebug(
    `${baseUrl}/${codigarioId}/items`,
    {
      method: "POST",
      headers: tenantHeader,
      body: JSON.stringify({
        codigo: "ART2_" + Date.now(),
        nombre: "Otro item"
      })
    },
    "ITEM2 CREATE"
  );

  itemId2 = item2?.id;


  // ================================
  // DELETE ITEM
  // ================================

  logStep("DELETE ITEM");

  const deletedItem = await fetchDebug(
    `${baseUrl}/${codigarioId}/items/${itemId}`,
    {
      method: "DELETE",
      headers: tenantHeader
    },
    "DELETE ITEM"
  );

  result.pasos.deleteItem = deletedItem?.ok ? "✅" : "❌";


  // ================================
  // DELETE CODIGARIO
  // ================================

  logStep("DELETE CODIGARIO");

  const deletedCodigario = await fetchDebug(
    `${baseUrl}/${codigarioId}`,
    {
      method: "DELETE",
      headers: tenantHeader
    },
    "DELETE CODIGARIO"
  );

  result.pasos.deleteCodigario = deletedCodigario?.ok ? "✅" : "❌";


} catch (err) {
  console.error("\n💥 TEST FALLÓ:\n", err.message);
}

console.log("\n📊 RESULTADOS\n");
console.table(result.pasos);

console.log("\n🧹 CLEANUP\n");

async function safeDelete(url, label) {
  try {
    await fetch(url, { method: "DELETE", headers: tenantHeader });
    logOk(label);
  } catch {
    logFail(label);
  }
}

if (itemId2) await safeDelete(`${baseUrl}/${codigarioId}/items/${itemId2}`, "delete item2");
if (itemId) await safeDelete(`${baseUrl}/${codigarioId}/items/${itemId}`, "delete item");
if (codigarioId) await safeDelete(`${baseUrl}/${codigarioId}`, "delete codigario");

console.log("\n🏁 FIN TEST\n");

})();