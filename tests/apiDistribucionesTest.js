const baseUrl = "http://localhost:3000/api/distribuciones";
const asignacionesUrl = "http://localhost:3000/api/asignaciones";
const agentesUrl = "http://localhost:3000/api/agentes";
const unidadesUrl = "http://localhost:3000/api/unidades";

const tenantHeader = {
  "x-institucion-id": "1",
  "Content-Type": "application/json"
};

let result = { pasos: {} };

try {

  // ================================
  // 🔹 PREPARACIÓN (agente + unidad + asignación)
  // ================================

  const agente = {
    nombre: "AgenteTest",
    apellido: "Distrib",
    documento: String(Math.floor(Math.random() * 10000000)),
    email: `test${Date.now()}@mail.com`
  };

  const unidad = {
    nombre: "Unidad Test " + Date.now(),
    codigoUnidad: Math.floor(Math.random() * 1000000),
    tipo: "AULA"
  };

  // crear agente
  const agenteRes = await fetch(agentesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(agente)
  });
  const agenteData = await agenteRes.json();
  const agenteId = agenteData.agente?.id || agenteData.id;

  // crear unidad
  const unidadRes = await fetch(unidadesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(unidad)
  });
  const unidadData = await unidadRes.json();
  const unidadId = unidadData.id;

  // crear asignación
  const asignacionRes = await fetch(asignacionesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      agenteId,
      unidadId,
      identificadorEstructural: "ASIG_" + Date.now(),
      fecha_inicio: new Date().toISOString()
    })
  });

  const asignacionData = await asignacionRes.json();
  const asignacionId = asignacionData.id;

  console.log("Asignación ID:", asignacionId);

  // ================================
  // 🔹 CREATE
  // ================================

  const distribucion = {
    asignacionId,
    version: 1,
    fecha_vigencia_desde: new Date().toISOString()
  };

  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(distribucion)
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error("CREATE failed:", createRes.status, text);
    throw new Error("Error en POST");
  }

  const created = await createRes.json();
  const distribucionId = String(created.id);

  result.pasos.create = distribucionId ? "✅" : "❌";
  console.log("Distribución creada con ID:", distribucionId);

  // ================================
  // 🔹 VALIDACIÓN VERSION ÚNICA
  // ================================

  const duplicateRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(distribucion) // misma version
  });

  if (duplicateRes.status === 409) {
    result.pasos.duplicado = "✅";
  } else {
    const text = await duplicateRes.text();
    console.error("DUPLICATE failed:", duplicateRes.status, text);
    result.pasos.duplicado = "❌";
  }

  // ================================
  // 🔹 GET BY ID
  // ================================

  const getRes = await fetch(`${baseUrl}/${distribucionId}`, {
    headers: tenantHeader
  });

  if (!getRes.ok) {
    result.pasos.getId = "❌";
  } else {
    const data = await getRes.json();
    result.pasos.getId = data.id === created.id ? "✅" : "❌";
  }

  // ================================
  // 🔹 PATCH
  // ================================

  const nuevaFechaHasta = new Date(Date.now() + 86400000).toISOString();

  const patchRes = await fetch(`${baseUrl}/${distribucionId}`, {
    method: "PATCH",
    headers: tenantHeader,
    body: JSON.stringify({
      fecha_vigencia_hasta: nuevaFechaHasta
    })
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.error("PATCH failed:", patchRes.status, text);
    result.pasos.patch = "❌";
    result.pasos.verificarPatch = "❌";
  } else {
    const patched = await patchRes.json();

    result.pasos.patch =
      patched.fecha_vigencia_hasta !== null ? "✅" : "❌";

    // verificar
    const verifyRes = await fetch(`${baseUrl}/${distribucionId}`, {
      headers: tenantHeader
    });

    if (!verifyRes.ok) {
      result.pasos.verificarPatch = "❌";
    } else {
      const verify = await verifyRes.json();
      result.pasos.verificarPatch =
        verify.fecha_vigencia_hasta !== null ? "✅" : "❌";
    }
  }

  // ================================
  // 🔹 DELETE
  // ================================

  const deleteRes = await fetch(`${baseUrl}/${distribucionId}`, {
    method: "DELETE",
    headers: tenantHeader
  });

  if (!deleteRes.ok) {
    const text = await deleteRes.text();
    console.error("DELETE failed:", deleteRes.status, text);
    result.pasos.delete = "❌";
  } else {
    const deleted = await deleteRes.json();
    result.pasos.delete = deleted.ok ? "✅" : "❌";
  }

} catch (err) {
  console.error("Error general en test:", err.message);
}

// ================================
// 🔹 RESULTADO FINAL
// ================================
console.table(result.pasos);