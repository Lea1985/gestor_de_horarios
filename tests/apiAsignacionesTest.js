const baseUrl = "http://localhost:3000/api/asignaciones";
const agentesUrl = "http://localhost:3000/api/agentes";
const unidadesUrl = "http://localhost:3000/api/unidades";

const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let asignacionResult = { pasos: {} };

try {

  // ================================
  // 🔹 PREPARACIÓN (crear agente y unidad)
  // ================================

  const agente = {
    nombre: "AgenteTest",
    apellido: "QA",
    documento: String(Math.floor(Math.random() * 10000000)),
    email: `test${Date.now()}@mail.com`
  };

  const unidad = {
    nombre: "Unidad Test " + Date.now(),
    codigoUnidad: Math.floor(Math.random() * 1000000),
    tipo: "AULA"
  };

  const agenteRes = await fetch(agentesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(agente)
  });

  const agenteData = await agenteRes.json();
  const agenteId = agenteData.agente?.id || agenteData.id;

  const unidadRes = await fetch(unidadesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(unidad)
  });

  const unidadData = await unidadRes.json();
  const unidadId = unidadData.id;

  console.log("Agente ID:", agenteId);
  console.log("Unidad ID:", unidadId);

  // ================================
  // 🔹 CREATE
  // ================================

  const asignacion = {
    agenteId,
    unidadId,
    identificadorEstructural: "ASIG_" + Date.now(),
    fecha_inicio: new Date().toISOString()
  };

  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(asignacion)
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error("CREATE failed:", createRes.status, text);
    throw new Error("Error en POST");
  }

  const created = await createRes.json();
  const asignacionId = String(created.id);

  asignacionResult.pasos.create = asignacionId ? "✅" : "❌";
  console.log("Asignación creada con ID:", asignacionId);

  // ================================
  // 🔹 VALIDACIÓN DUPLICADO
  // ================================

  const duplicateRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(asignacion)
  });

  if (duplicateRes.status === 409) {
    asignacionResult.pasos.duplicado = "✅";
  } else {
    const text = await duplicateRes.text();
    console.error("DUPLICATE failed:", duplicateRes.status, text);
    asignacionResult.pasos.duplicado = "❌";
  }

  // ================================
  // 🔹 GET BY ID
  // ================================

  const getRes = await fetch(`${baseUrl}/${asignacionId}`, {
    headers: tenantHeader
  });

  if (!getRes.ok) {
    const text = await getRes.text();
    console.error("GET failed:", getRes.status, text);
    asignacionResult.pasos.getId = "❌";
  } else {
    const data = await getRes.json();
    asignacionResult.pasos.getId = data.id === created.id ? "✅" : "❌";
  }

  // ================================
  // 🔹 PATCH
  // ================================

  const nuevaFechaFin = new Date(Date.now() + 86400000).toISOString();

  const patchRes = await fetch(`${baseUrl}/${asignacionId}`, {
    method: "PATCH",
    headers: tenantHeader,
    body: JSON.stringify({ fecha_fin: nuevaFechaFin })
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.error("PATCH failed:", patchRes.status, text);
    asignacionResult.pasos.patch = "❌";
    asignacionResult.pasos.verificarPatch = "❌";
  } else {
    const patched = await patchRes.json();

    asignacionResult.pasos.patch =
      patched.fecha_fin !== null ? "✅" : "❌";

    // ================================
    // 🔹 VERIFY PATCH
    // ================================

    const verifyRes = await fetch(`${baseUrl}/${asignacionId}`, {
      headers: tenantHeader
    });

    if (!verifyRes.ok) {
      asignacionResult.pasos.verificarPatch = "❌";
    } else {
      const verify = await verifyRes.json();
      asignacionResult.pasos.verificarPatch =
        verify.fecha_fin !== null ? "✅" : "❌";
    }
  }

  // ================================
  // 🔹 DELETE
  // ================================

  const deleteRes = await fetch(`${baseUrl}/${asignacionId}`, {
    method: "DELETE",
    headers: tenantHeader
  });

  if (!deleteRes.ok) {
    const text = await deleteRes.text();
    console.error("DELETE failed:", deleteRes.status, text);
    asignacionResult.pasos.delete = "❌";
  } else {
    const deleted = await deleteRes.json();
    asignacionResult.pasos.delete = deleted.ok ? "✅" : "❌";
  }

} catch (err) {
  console.error("Error general en test:", err.message);
}

// ================================
// 🔹 RESULTADO FINAL
// ================================
console.table(asignacionResult.pasos);