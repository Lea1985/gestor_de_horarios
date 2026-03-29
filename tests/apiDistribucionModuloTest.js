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

// ── helpers ────────────────────────────────────────────────────────────────

async function postOrFetch(url, body, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (res.status === 409) {
    // Recurso ya existe — devolver el body del 409 si trae el objeto,
    // o relanzar si el 409 no trae datos utilizables.
    const data = await res.json();
    const entity = data.modulo ?? data.distribucionModulo ?? data;
    if (entity?.id) return { data: entity, created: false };
    throw new Error(`409 sin entidad en body: ${url}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} en POST ${url}: ${text}`);
  }

  return { data: await res.json(), created: true };
}

// ── test ───────────────────────────────────────────────────────────────────

let result = { pasos: {} };

try {
  // ── AGENTE ──────────────────────────────────────────────────────────────
  const agenteRes = await fetch(agentesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: "AgenteTest",
      apellido: "Modulo",
      documento: String(Math.floor(Math.random() * 10_000_000)),
      email: `test${Date.now()}@mail.com`
    })
  });
  if (!agenteRes.ok) throw new Error("Error creando agente");
  const agenteData = await agenteRes.json();
  const agenteId = agenteData.agente?.id ?? agenteData.id;

  // ── UNIDAD ──────────────────────────────────────────────────────────────
  const unidadRes = await fetch(unidadesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      nombre: "Unidad Test " + Date.now(),
      codigoUnidad: Math.floor(Math.random() * 1_000_000),
      tipo: "AULA"
    })
  });
  if (!unidadRes.ok) throw new Error("Error creando unidad");
  const unidadId = (await unidadRes.json()).id;

  // ── ASIGNACIÓN ──────────────────────────────────────────────────────────
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
  if (!asignacionRes.ok) throw new Error("Error creando asignación");
  const asignacionId = (await asignacionRes.json()).id;

  // ── DISTRIBUCIÓN ─────────────────────────────────────────────────────────
  const distribucionRes = await fetch(distribucionesUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({
      asignacionId,
      version: 1,
      fecha_vigencia_desde: new Date().toISOString()
    })
  });
  if (!distribucionRes.ok) throw new Error("Error creando distribución");
  const distribucionId = (await distribucionRes.json()).id;
  console.log("Distribución ID:", distribucionId);

  // ── MÓDULO HORARIO ───────────────────────────────────────────────────────
  // Los módulos son catálogo compartido (dia+hora_desde+hora_hasta únicos).
  // Si ya existe el combo, reutilizamos el registro existente via postOrFetch.
  const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
  const horaInicio = Math.floor(Math.random() * 20);
  const moduloPayload = {
    dia_semana: dias[Math.floor(Math.random() * dias.length)],
    hora_desde: horaInicio,
    hora_hasta: horaInicio + 1,
    institucionId: 1
  };

  const { data: moduloData } = await postOrFetch(modulosUrl, moduloPayload, tenantHeader);
  const moduloId = moduloData.id;
  console.log("Módulo ID:", moduloId, moduloData._created === false ? "(reutilizado)" : "(nuevo)");

  const compositeId = `${distribucionId}-${moduloId}`;

  // ── CREATE DistribuciónModulo ────────────────────────────────────────────
  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({ distribucionHorariaId: distribucionId, moduloHorarioId: moduloId })
  });
  if (!createRes.ok) throw new Error("Error en create");
  const created = await createRes.json();
  result.pasos.create = created.distribucionHorariaId === distribucionId ? "✅" : "❌";

  // ── DUPLICADO (debe devolver 409) ────────────────────────────────────────
  const duplicateRes = await fetch(baseUrl, {
    method: "POST",
    headers: tenantHeader,
    body: JSON.stringify({ distribucionHorariaId: distribucionId, moduloHorarioId: moduloId })
  });
  result.pasos.duplicado = duplicateRes.status === 409 ? "✅" : "❌";

  // ── GET BY ID ────────────────────────────────────────────────────────────
  const getRes = await fetch(`${baseUrl}/${compositeId}`, { headers: tenantHeader });
  if (!getRes.ok) {
    result.pasos.getId = "❌";
  } else {
    const data = await getRes.json();
    result.pasos.getId = data.moduloHorarioId === moduloId ? "✅" : "❌";
  }

  // ── GET ALL ──────────────────────────────────────────────────────────────
  const getAllRes = await fetch(baseUrl, { headers: tenantHeader });
  if (!getAllRes.ok) {
    result.pasos.getAll = "❌";
  } else {
    const data = await getAllRes.json();
    result.pasos.getAll = Array.isArray(data) ? "✅" : "❌";
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  const deleteRes = await fetch(`${baseUrl}/${compositeId}`, {
    method: "DELETE",
    headers: tenantHeader
  });
  const deleted = await deleteRes.json();
  result.pasos.delete = deleted.ok ? "✅" : "❌";

  // ── DELETE IDEMPOTENTE ───────────────────────────────────────────────────
  const deleteAgainRes = await fetch(`${baseUrl}/${compositeId}`, {
    method: "DELETE",
    headers: tenantHeader
  });
  const deleteAgain = await deleteAgainRes.json();
  result.pasos.deleteIdempotente = deleteAgain.ok && deleteAgain.deleted === false ? "✅" : "❌";

} catch (err) {
  console.error("Error general en test:", err.message);
}

console.table(result.pasos);