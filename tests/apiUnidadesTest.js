const baseUrl = "http://localhost:3000/api/unidades";
const tenantHeader = { 
  "x-institucion-id": "1", 
  "Content-Type": "application/json" 
};

// Unidad base para pruebas
const unidad = {
  nombre: "Unidad Test " + Date.now(),
  codigoUnidad: Math.floor(Math.random() * 1000000),
  tipo: "AULA"
};

let unidadResult = { pasos: {} };

try {
  // ===== CREATE =====
  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(unidad),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error("CREATE failed:", createRes.status, text);
    throw new Error("Error en POST");
  }

  const created = await createRes.json();
  const unidadId = String(created.id);
  unidadResult.pasos.create = unidadId ? "✅" : "❌";
  console.log("Unidad creada con ID:", unidadId);

  // ===== VALIDACIÓN CÓDIGO ÚNICO =====
  const duplicateRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify(unidad), // mismo codigoUnidad
  });

  if (duplicateRes.status === 409) {
  unidadResult.pasos.codigoUnico = "✅";
} else {
  const text = await duplicateRes.text();
  console.error("DUPLICATE failed:", duplicateRes.status, text);
  unidadResult.pasos.codigoUnico = "❌";
}

  // ===== GET BY ID =====
  const getRes = await fetch(`${baseUrl}/${unidadId}`, { headers: tenantHeader });
  if (!getRes.ok) {
    const text = await getRes.text();
    console.error("GET failed:", getRes.status, text);
    unidadResult.pasos.getId = "❌";
  } else {
    const getById = await getRes.json();
    unidadResult.pasos.getId = getById.id === created.id ? "✅" : "❌";
  }

  // ===== PATCH =====
  const nuevoNombre = unidad.nombre + " Modificada";
  const patchRes = await fetch(`${baseUrl}/${unidadId}`, {
    method: "PATCH",
    headers: tenantHeader,
    body: JSON.stringify({ nombre: nuevoNombre }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.error("PATCH failed:", patchRes.status, text);
    unidadResult.pasos.patch = "❌";
    unidadResult.pasos.verificarPatch = "❌";
  } else {
    const patched = await patchRes.json();
    unidadResult.pasos.patch = patched.nombre === nuevoNombre ? "✅" : "❌";

    // ===== VERIFICAR PATCH =====
    const verifyRes = await fetch(`${baseUrl}/${unidadId}`, { headers: tenantHeader });
    if (!verifyRes.ok) {
      const text = await verifyRes.text();
      console.error("VERIFY PATCH failed:", verifyRes.status, text);
      unidadResult.pasos.verificarPatch = "❌";
    } else {
      const verify = await verifyRes.json();
      unidadResult.pasos.verificarPatch = verify.nombre === nuevoNombre ? "✅" : "❌";
    }
  }

  // ===== DELETE =====
  const deleteRes = await fetch(`${baseUrl}/${unidadId}`, {
    method: "DELETE",
    headers: tenantHeader,
  });

  if (!deleteRes.ok) {
    const text = await deleteRes.text();
    console.error("DELETE failed:", deleteRes.status, text);
    unidadResult.pasos.delete = "❌";

    // 💡 Validación extra: verificar si falló por tener asignaciones
    if (text.includes("tiene asignaciones asociadas")) {
      unidadResult.pasos.delete = "⚠ Unidad con asignaciones no eliminada (✅ validación)";
    }
  } else {
    const deleted = await deleteRes.json();
    unidadResult.pasos.delete = deleted.ok ? "✅" : "❌";
  }

} catch (err) {
  console.error("Error general en test:", err.message);
}

// ===== RESULTADO FINAL =====
console.table(unidadResult.pasos);