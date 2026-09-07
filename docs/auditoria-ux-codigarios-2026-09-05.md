# Auditoría UX Funcional y Operativa — Módulo Codigarios

## 1. Resumen ejecutivo

El módulo Codigarios (catálogo de codigarios + artículos/items, con el campo "% Computable") es funcionalmente simple —dos pantallas CRUD con el mismo patrón visual usado en el resto de ALNEXT— pero tiene un problema central que coincide exactamente con el eje pedido en este prompt: **la pantalla de edición de un item no comunica en ningún momento que cambiar "% Computable" tiene efecto retroactivo sobre liquidaciones ya calculadas de períodos pasados**. Se confirmó en el schema (`Incidencia.codigarioItemId`) y en el dataset de liquidación (`obtenerModulosComputables.ts`, `obtenerJornadas.ts`) que el porcentaje se lee en vivo desde `CodigarioItem` en cada cálculo — no hay ningún snapshot histórico del valor vigente al momento de la incidencia. Esto significa que corregir el porcentaje de un código hoy recalcula silenciosamente el pago de todas las incidencias históricas asociadas a ese código, incluyendo períodos ya cerrados, sin ningún aviso en el formulario de edición.

Además se encontró una **discrepancia real backend/frontend** en el bloqueo de borrado de un Codigario: el frontend decide si mostrar el botón "Eliminar" contando solo items activos, pero el backend bloquea el borrado contando también los items dados de baja — produciendo un mensaje de error contradictorio ("posee items asociados" cuando la pantalla muestra "0 items"). Se encontró también el patrón, ya visto en otros módulos de esta ronda de auditorías, de mensajes de confirmación que afirman irreversibilidad ("no se puede deshacer") sobre acciones que en realidad son reversibles (soft-delete + botón "Reactivar"), y ausencia total de feedback de éxito (crear/editar/eliminar/reactivar no muestran ningún mensaje positivo, solo el silencio de la tabla actualizándose).

No se encontraron problemas de arquitectura (no hay reglas de negocio en la UI; las validaciones de negocio viven en los usecases) ni riesgos de pérdida de datos catastrófica. El hallazgo de mayor impacto real es de comunicación de consecuencia económica, no de estabilidad del sistema.

## 2. Rama y commit auditado; acceso a navegador

- **Rama:** `refactor-clases-programadas-frontend`
- **Commit:** `9b4f805057d2525eb377e13e7cd5d442d856b769`
- **Working tree:** limpio (sin cambios pendientes) al momento de auditar.
- **Acceso a navegador:** el dev server de Next (`next dev`, puerto 3000) está corriendo y responde `200` en `/protected/dashboard/codigarios` (verificado con `curl`), pero **no hay ninguna herramienta de navegador/interacción disponible en esta sesión** (se buscó explícitamente, no existe). No se pudo iniciar sesión ni ejecutar clics reales, y no se generaron datos de prueba en ningún tenant. **Todos los hallazgos están marcados "Fuente: código (inferido)"**, salvo donde se cita evidencia de schema/tests que sí es verificable de forma determinística. Tenant de prueba identificado para una sesión futura con navegador: `Escuela Primaria N°12` (`prisma/seed.ts:123`), mismo usado en auditorías previas de este ciclo.
- **Nota sobre `porcentajeComputable`:** por indicación explícita del usuario, el campo `porcentajeComputable` de `CodigarioItem` y su regla de negocio (los módulos computables cuentan clases `PROGRAMADA` —futuras o pendientes— al 100%) ya fueron trabajados en sesiones anteriores fuera de este ciclo de 10 auditorías (carga de valores reales en la pantalla de gestión, confirmado en `docs/punto-de-partida-session de cierre-2026-08-17.md` y `-08-18.md`). Esta auditoría **no** cuestiona la corrección del cálculo ni esa regla de negocio; se limita a si la pantalla de edición comunica su impacto antes de guardar.

## 3. Alcance auditado (rutas confirmadas en el repo)

Pantallas:
- `app/protected/dashboard/codigarios/page.tsx` — listado de codigarios (catálogos).
- `app/protected/dashboard/codigarios/[id]/page.tsx` — detalle de un codigario y gestión de sus items/artículos.

Fuera de alcance de este módulo (auditados o a auditar por separado, mencionados solo como consumidores del dato):
- `app/protected/dashboard/reportes/codigarios/page.tsx` (reporte de solo lectura).
- `app/protected/dashboard/reportes/modulos-computables/page.tsx` (liquidación).
- `lib/reporting/datasets/obtenerModulosComputables.ts`, `obtenerJornadas.ts` (consumidores del `porcentajeComputable`, citados como evidencia del impacto real, no auditados en sí).

API:
- `app/api/codigarios/route.ts` (GET, POST)
- `app/api/codigarios/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/codigarios/[id]/reactivar/route.ts` (POST)
- `app/api/codigarios/[id]/items/route.ts` (GET, POST)
- `app/api/codigarios/[id]/items/[itemId]/route.ts` (GET, PATCH, DELETE)
- `app/api/codigarios/[id]/items/[itemId]/reactivar/route.ts` (POST)

UseCases: `lib/usecases/codigarios/{listarCodigarios,obtenerCodigario,crearCodigario,actualizarCodigario,eliminarCodigario,reactivarCodigario,crearItem,actualizarItem,eliminarItem,reactivarItem}.ts`

Repository: `lib/repositories/codigarioRepository.ts`

Modelos: `Codigario`, `CodigarioItem` (`prisma/schema.prisma`).

## 4. Inventario de pantallas

### 4.1 `/codigarios` — Listado de codigarios
- **Objetivo:** ver, crear, editar, eliminar (soft) y reactivar catálogos de codigarios institucionales.
- **Rol esperado:** administrativo/RRHH — quien define categorías de ausentismo/licencias que después se usan al cargar incidencias.
- **Acciones:** "+ Nuevo codigario", "Editar", "Eliminar" (solo si 0 items activos), "Reactivar" (si inactivo), toggle "Ver inactivos", buscador por nombre/descripción.
- **Formulario:** Nombre (obligatorio, se normaliza a mayúsculas, valida duplicado client-side contra codigarios activos), Descripción (opcional).
- **Tabla:** Nombre (+ badge "Inactivo"), Descripción, Items (contador, link al detalle si activo), Acciones.
- **Modal:** `ModalConfirmar` genérico para eliminar codigario.
- **Mensajes:** banner de error rojo dismissible arriba de la tabla; sin mensaje de éxito en ningún caso.
- **Navegación posterior:** el link de "N items" lleva a `/codigarios/[id]`.

### 4.2 `/codigarios/[id]` — Detalle de codigario y gestión de items
- **Objetivo:** ver, crear, editar y eliminar/reactivar los artículos (`CodigarioItem`) de un codigario puntual, incluyendo el campo "% Computable".
- **Rol esperado:** mismo que el listado.
- **Acciones:** "← Volver" (a `/codigarios`), "+ Nuevo item", "Editar"/"Eliminar" por fila, "Reactivar" si inactivo, toggle "Ver inactivos", buscador por código/nombre/descripción.
- **Formulario:** Código (obligatorio), Nombre (obligatorio), Descripción (opcional), "% Computable" (obligatorio, numérico 0–100, default "100" al crear).
- **Tabla:** Código (+ badge "Inactivo"), Nombre, Descripción, "% Computable", Acciones.
- **Modal:** mismo `ModalConfirmar` (copia independiente del componente, no compartido) para eliminar item.
- **Mensajes:** mismo patrón que el listado — banner de error, sin mensaje de éxito.
- **Navegación posterior:** ninguna tras crear/editar/eliminar (se queda en la misma pantalla); "← Volver" es la única salida hacia arriba.

## 5. Matriz de acciones críticas

| Pantalla | Acción | API | UseCase → Repository | Resultado esperado |
|---|---|---|---|---|
| `/codigarios` | Crear codigario | `POST /api/codigarios` | `crearCodigario` → `codigarioRepository.crear` | Nombre único (mayúsculas), aparece en tabla |
| `/codigarios` | Editar codigario | `PATCH /api/codigarios/[id]` | `actualizarCodigario` → `.actualizar` | Nombre/descripción actualizados |
| `/codigarios` | Eliminar codigario | `DELETE /api/codigarios/[id]` | `eliminarCodigario` → `.tieneItems` + `.eliminar` | Soft-delete si no tiene items |
| `/codigarios` | Reactivar codigario | `POST /api/codigarios/[id]/reactivar` | `reactivarCodigario` → `.reactivar` | Vuelve a `activo:true`, salvo nombre duplicado |
| `/codigarios/[id]` | Crear item | `POST /api/codigarios/[id]/items` | `crearItem` → `.crearItem` | Item nuevo o reactivación silenciosa si el código existía borrado |
| `/codigarios/[id]` | **Editar item (incl. % Computable)** | `PATCH /api/codigarios/[id]/items/[itemId]` | `actualizarItem` → `.actualizarItem` | Cambia valores; **efecto retroactivo no comunicado** |
| `/codigarios/[id]` | Eliminar item | `DELETE /api/codigarios/[id]/items/[itemId]` | `eliminarItem` → `.eliminarItem` | Soft-delete, idempotente si ya estaba borrado |
| `/codigarios/[id]` | Reactivar item | `POST /api/codigarios/[id]/items/[itemId]/reactivar` | `reactivarItem` → `.reactivarItem` | Vuelve a `activo:true` |

## 6. Hallazgos

### UX-COD-001 — Editar "% Computable" no comunica su impacto retroactivo sobre liquidaciones ya calculadas
**Prioridad:** P1  **Tipo:** VALIDACIÓN DE NEGOCIO / MENSAJE  **Fuente:** código (inferido)
**Pantalla:** `/codigarios/[id]` — formulario "Editar item"
**Acción:** Cambiar el valor de "% Computable" de un item existente y guardar.
**Resultado esperado:** Antes de confirmar un cambio que afecta cuánto se le paga a un docente por incidencias ya ocurridas (incluso en períodos operativos ya cerrados), el sistema debería advertir esa consecuencia explícitamente.
**Resultado actual:** El campo se presenta como un input numérico más, con la única validación "Entero entre 0 y 100" (`app/protected/dashboard/codigarios/[id]/page.tsx:325,193-196`). El botón dice simplemente "Guardar cambios", igual que si se editara el nombre o la descripción. No hay modal de confirmación diferenciado, ni texto de advertencia, ni indicación de cuántas incidencias históricas usan ese item.
Se confirmó en el modelo de datos que el efecto es real y retroactivo: `Incidencia.codigarioItemId` es una FK simple sin snapshot del porcentaje vigente al momento del hecho (`prisma/schema.prisma:424-448`). Los datasets de liquidación leen el porcentaje **en vivo** desde `CodigarioItem` en cada cálculo:
```ts
// lib/reporting/datasets/obtenerModulosComputables.ts:87-103
incidencia: { select: { codigarioItem: { select: { codigo, nombre, porcentajeComputable } } } }
...
const porcentajeComputable = c.incidencia?.codigarioItem?.porcentajeComputable ?? 100
```
Mismo patrón en `lib/reporting/datasets/obtenerJornadas.ts:107,145`. No existe ninguna tabla de auditoría/versión de `porcentajeComputable`.
**Evidencia:** `app/protected/dashboard/codigarios/[id]/page.tsx:189-226` (formulario y `guardar()`); `lib/usecases/codigarios/actualizarItem.ts:15-29` (sin ningún control de impacto ni advertencia); `lib/reporting/datasets/obtenerModulosComputables.ts:87-116`; `prisma/schema.prisma:424-448`.
**Impacto para el usuario:** Un operador que corrige el porcentaje de un código para casos futuros (p. ej. "a partir de ahora ENF paga 85% en vez de 100%") recalcula sin saberlo el pago de **todas** las incidencias pasadas con ese código, incluyendo períodos operativos ya cerrados y liquidaciones ya entregadas al liquidador de sueldos. No hay forma de saber, desde esta pantalla, cuántos registros históricos se verán afectados ni de limitar el cambio "de ahora en adelante".
**Recomendación:** Antes de guardar un cambio de `porcentajeComputable` sobre un item existente, mostrar cuántas incidencias/clases ya computadas usan ese item y una advertencia explícita ("Este cambio recalcula el pago de N incidencias ya registradas, incluyendo períodos cerrados"). Evaluar a futuro (fuera de esta auditoría, es un cambio de modelo) si conviene versionar el porcentaje o registrar el valor vigente al crear la `Incidencia`. (NO implementar — documentar solamente.)

**Nota de reclasificación (P0→P1, acordado con el usuario):** el disparador directo —editar el % a mano sobre un item existente— es de frecuencia real muy baja (más de 15 años de operación sin cambiar un porcentaje de descuento). Se mantiene como P1 en vez de descartarse porque (a) el costo del fix es mínimo, una advertencia de texto sin cambio de modelo, y (b) el camino más probable hacia el mismo daño no es este formulario sino UX-COD-003 (recrear un código previamente eliminado reactiva el item y su historial en silencio) — la advertencia debería cubrir también ese flujo.

---

### UX-COD-002 — El backend bloquea el borrado de un codigario por items que el frontend ya no cuenta, generando un mensaje contradictorio
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO / VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** `/codigarios`
**Acción:** Eliminar un codigario cuyos items estuvieron todos dados de baja (soft-delete) previamente, pero ninguno activo.
**Resultado esperado:** Si la pantalla muestra "0 items" para ese codigario y por eso ofrece el botón "Eliminar" (en vez del texto "Tiene N items"), la eliminación debería poder completarse, o el mensaje de error debería explicar por qué no, en términos consistentes con lo que el usuario ve en pantalla.
**Resultado actual:** El frontend decide mostrar "Eliminar" vs. "Tiene N items" según `c._count.items`, que en el listado se computa **solo con items activos**:
```ts
// lib/repositories/codigarioRepository.ts:14-25 (listar)
include: { _count: { select: { items: { where: { deletedAt: null } } } } }
```
El backend, en cambio, bloquea el borrado contando **todos** los items del codigario sin filtrar por `deletedAt`:
```ts
// lib/repositories/codigarioRepository.ts:52-63
async tieneItems(codigarioId, tenantId) {
  const cantidad = await prisma.codigarioItem.count({
    where: { codigarioId, codigario: { institucionId: tenantId } }, // sin deletedAt
  })
  return cantidad > 0
}
```
Si un codigario tuvo items que luego se eliminaron (soft-delete) todos, la pantalla lo muestra con "0 items" y ofrece "Eliminar" (`app/protected/dashboard/codigarios/page.tsx:376-391`), pero al confirmar, el `DELETE` responde 409 con `"No se puede eliminar el codigario porque posee items asociados"` (`lib/usecases/codigarios/eliminarCodigario.ts:9-13,22-26`), mensaje que contradice directamente el "0 items" visible en la misma fila.
**Evidencia:** `lib/repositories/codigarioRepository.ts:14-25` vs. `:52-63`; `lib/usecases/codigarios/eliminarCodigario.ts:9-26`; `app/protected/dashboard/codigarios/page.tsx:324-325,376-391`.
**Impacto para el usuario:** El usuario ve un mensaje de error que no puede reconciliar con lo que la pantalla le mostró un segundo antes ("0 items" → "posee items asociados"), sin ninguna pista de que la causa son items inactivos invisibles en la vista por defecto. Únicamente activando "Ver inactivos" podría descubrir por sí mismo la causa real, pero nada en el mensaje de error lo sugiere.
**Recomendación:** Unificar el criterio: si la intención es no permitir borrar codigarios con historial (items activos o no), el contador de la tabla debería reflejar el total real usado en la validación; si la intención es permitir borrar codigarios con solo items inactivos, `tieneItems` debería filtrar por `deletedAt: null` igual que el listado. Además, si se mantiene el bloqueo, el mensaje de error debería mencionar explícitamente "incluye items inactivos" para que el 409 sea explicable. (NO implementar.)

---

### UX-COD-003 — Crear un item con un código previamente eliminado lo reactiva y sobrescribe sus datos en silencio
**Prioridad:** P1  **Tipo:** FEEDBACK AUSENTE / VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** `/codigarios/[id]` — "+ Nuevo item"
**Acción:** Crear un item usando un código que ya existió en ese codigario y fue eliminado (soft-delete) en el pasado.
**Resultado esperado:** El usuario que completa el formulario de "Nuevo item" espera crear un registro nuevo; si en cambio el sistema resucita un registro pasado (con su `id` original, y por lo tanto con el mismo vínculo a `Incidencia`s históricas), debería saberlo antes o después de guardar.
**Resultado actual:** `codigarioRepository.crearItem` busca primero si el código ya existe en ese codigario (activo o no); si existe pero está soft-deleted, en vez de crear una fila nueva **actualiza la fila existente** con los datos del formulario y la reactiva:
```ts
// lib/repositories/codigarioRepository.ts:196-220
if (!existente) { /* crea nuevo */ }
if (!existente.deletedAt && existente.activo) throw new ItemDuplicadoError()
// existe borrado lógico -> reactivar
return prisma.codigarioItem.update({ where: { id: existente.id }, data: { ...data, activo: true, deletedAt: null } })
```
La respuesta HTTP es `201 Created` en ambos casos (`app/api/codigarios/[id]/items/route.ts:32-33`), y el frontend no distingue el resultado: solo hace `await cargar(); cancelar()` sin ningún mensaje (`app/protected/dashboard/codigarios/[id]/page.tsx:217-220`).
**Evidencia:** `lib/repositories/codigarioRepository.ts:189-221`; `app/api/codigarios/[id]/items/route.ts:22-47`; `app/protected/dashboard/codigarios/[id]/page.tsx:200-226`.
**Impacto para el usuario:** Esto agrava a UX-COD-001: si el "nuevo" item resucitado ya tenía `Incidencia`s vinculadas de cuando existía originalmente (mismo `id`, nunca cambia), el "% Computable" que el usuario cargue ahora —creyendo que arranca de cero— reescribe retroactivamente el pago de esas incidencias históricas, sin que el operador tenga forma de saber que el código no era nuevo. No hay ningún indicio en pantalla (ni antes ni después de guardar) de que se trató de una reactivación y no de una creación real.
**Recomendación:** Si el código coincide con un item eliminado, mostrar antes de guardar algo como "Ya existió un item con este código, eliminado el [fecha]. ¿Reactivarlo con estos datos o usar otro código?" en vez de fusionar la operación de forma transparente. (NO implementar.)

---

### UX-COD-004 — Los modales de confirmación de borrado afirman irreversibilidad sobre acciones que sí tienen "Reactivar"
**Prioridad:** P2  **Tipo:** MENSAJE
**Fuente:** código (inferido)
**Pantalla:** `/codigarios` y `/codigarios/[id]`
**Acción:** Eliminar un codigario o un item.
**Resultado esperado:** El texto de un modal de confirmación debería reflejar el comportamiento real del sistema: si la acción es reversible, no debería decir lo contrario.
**Resultado actual:** Ambos modales (copias independientes del mismo componente) usan el texto "Esta acción no se puede deshacer" (`app/protected/dashboard/codigarios/page.tsx:216`; `app/protected/dashboard/codigarios/[id]/page.tsx:274`), pero tanto `eliminarCodigario` como `eliminarItem` son soft-deletes (`deletedAt` + `activo:false`) y ambas pantallas ofrecen un botón "Reactivar" visible en la misma tabla apenas se activa "Ver inactivos".
**Evidencia:** `app/protected/dashboard/codigarios/page.tsx:214-219,360-366`; `app/protected/dashboard/codigarios/[id]/page.tsx:272-277,421-425`; `lib/repositories/codigarioRepository.ts:89-110,247-272` (soft-delete real).
**Impacto para el usuario:** Un usuario puede evitar innecesariamente una limpieza de catálogo legítima por miedo a una pérdida de datos que no va a ocurrir, o —al descubrir con el tiempo que "Eliminar" siempre es reversible— empezar a desconfiar de las advertencias de irreversibilidad del resto del sistema, incluidas las que sí son ciertas en otros módulos.
**Recomendación:** Cambiar el texto a algo como "Este codigario/item dejará de estar disponible para nuevas incidencias. Podés reactivarlo después desde 'Ver inactivos'." (NO implementar.)

---

### UX-COD-005 — Ninguna acción de este módulo muestra feedback de éxito
**Prioridad:** P2  **Tipo:** FEEDBACK AUSENTE
**Fuente:** código (inferido)
**Pantalla:** `/codigarios` y `/codigarios/[id]`
**Acción:** Crear, editar, eliminar o reactivar un codigario o item.
**Resultado esperado:** Tras una acción exitosa, algún indicio (toast, mensaje inline, resaltado transitorio) de que el cambio se aplicó, más allá de la tabla recargándose en silencio.
**Resultado actual:** Todos los flujos de éxito terminan en `await cargar(); cancelar()` (crear/editar) o simplemente `await cargar()` (eliminar/reactivar), sin ningún estado de éxito. Solo existe manejo explícito para el camino de error (`setError(...)`). Confirmado en los ocho handlers de ambas pantallas (`guardar`, `eliminar`, `reactivar` en cada una).
**Evidencia:** `app/protected/dashboard/codigarios/page.tsx:148-204`; `app/protected/dashboard/codigarios/[id]/page.tsx:200-263`.
**Impacto para el usuario:** Para ediciones de campos de texto (nombre, descripción) el cambio es visualmente evidente en la fila y el silencio es tolerable. Para "Reactivar" —que no cierra ningún formulario ni cambia de foco— el único indicio de éxito es que la fila deje de mostrar el badge "Inactivo" en la siguiente actualización de la tabla; si el usuario no mira exactamente esa fila, no tiene certeza de que el clic tuvo efecto.
**Recomendación:** Agregar un mensaje de éxito breve y transitorio (mismo patrón que ya podría existir en otros módulos de la app) al menos para "Reactivar", que es la acción con menor señal visual de cambio de estado. (NO implementar.)

---

### UX-COD-006 — El default "100%" en el formulario de nuevo item no advierte que es el valor de "sin descuento"
**Prioridad:** P2  **Tipo:** VALIDACIÓN DE NEGOCIO / FORMULARIO
**Fuente:** código (inferido)
**Pantalla:** `/codigarios/[id]` — "+ Nuevo item"
**Acción:** Crear un item nuevo sin tocar el campo "% Computable".
**Resultado esperado:** Si el valor por defecto tiene un significado de negocio fuerte ("paga el 100%, sin descuento"), el formulario debería dejarlo claro para que no se cree por omisión un código de descuento/licencia sin goce que en realidad paga completo.
**Resultado actual:** `FORM_VACIO` fija `porcentajeComputable: "100"` como default (`app/protected/dashboard/codigarios/[id]/page.tsx:28`), sin ninguna aclaración textual de que 100 significa "no genera descuento" y 0 significa "no paga". El campo se presenta con la misma neutralidad visual que "Código" o "Nombre".
**Evidencia:** `app/protected/dashboard/codigarios/[id]/page.tsx:22-28,320-346`. Comparar con `lib/pdf/documents/modulosComputables.ts:56` y `app/protected/dashboard/reportes/modulos-computables/page.tsx:339`, donde el 0% sí se resalta en rojo en el reporte de liquidación — la pantalla donde se define el valor no tiene ninguna señal equivalente.
**Impacto para el usuario:** Al cargar un código nuevo para un tipo de licencia que en realidad no debería pagarse completo, si el operador no cae en la cuenta de cambiar el default, el código queda pagando 100% sin ningún error ni advertencia — y el error solo se notaría, si acaso, al revisar la liquidación ya generada.
**Recomendación:** Agregar un texto de ayuda corto junto al campo ("100 = sin descuento, 0 = no paga") y/o quitar el default para forzar una elección consciente. (NO implementar.)

---

### UX-COD-007 — El listado de items de un codigario inactivo no es accesible incluso para consulta
**Prioridad:** P2  **Tipo:** NAVEGACIÓN
**Fuente:** código (inferido)
**Pantalla:** `/codigarios`
**Acción:** Ver los items de un codigario que fue desactivado (eliminado).
**Resultado esperado:** Antes de decidir si reactivar un codigario, poder consultar (aunque sea de solo lectura) qué artículos tenía.
**Resultado actual:** Para un codigario inactivo, la celda "Items" se renderiza como texto plano sin link (`app/protected/dashboard/codigarios/page.tsx:346-356`), a diferencia del codigario activo donde es un `Link` a `/codigarios/[id]`. Si además se navega directamente a esa URL (ej. un link guardado de antes de desactivarlo), la API responde 404 porque `obtenerPorId` filtra `deletedAt: null` sobre el propio codigario sin importar el parámetro `incluirInactivos` (que solo afecta el filtro de items, no el del codigario):
```ts
// lib/repositories/codigarioRepository.ts:27-37
obtenerPorId(id, tenantId, incluirInactivos = false) {
  return prisma.codigario.findFirst({
    where: { id, institucionId: tenantId, deletedAt: null }, // ignora incluirInactivos
    include: { items: { where: incluirInactivos ? {} : { deletedAt: null }, ... } },
  })
}
```
y la pantalla de detalle, ante el 404, renderiza únicamente `<div>No encontrado</div>` sin estilo ni link de vuelta (`app/protected/dashboard/codigarios/[id]/page.tsx:269`).
**Evidencia:** `app/protected/dashboard/codigarios/page.tsx:346-356`; `lib/repositories/codigarioRepository.ts:27-37`; `app/protected/dashboard/codigarios/[id]/page.tsx:269`.
**Impacto para el usuario:** Callejón sin salida real: `<div>No encontrado</div>` no tiene ningún link ni botón de retorno, obligando a editar la URL manualmente o usar el botón "atrás" del navegador. Es un caso de baja frecuencia (requiere una URL vieja o guardada) pero el resultado es una pantalla rota sin ninguna guía.
**Recomendación:** Si un codigario inactivo no debe poder verse en detalle, al menos la pantalla "No encontrado" debería incluir un link de vuelta a `/codigarios` con el mismo estilo del resto del módulo. (NO implementar.)

---

### UX-COD-008 — Ni "Eliminar" ni "Reactivar" muestran estado de carga; permiten doble clic
**Prioridad:** P2  **Tipo:** CARGA / ESTADO
**Fuente:** código (inferido)
**Pantalla:** `/codigarios` y `/codigarios/[id]`
**Acción:** Confirmar eliminación en el modal, o hacer clic en "Reactivar".
**Resultado esperado:** Mismo patrón ya usado en "Guardar cambios" (`disabled={guardando}` + texto "Guardando..."): el botón debería reflejar que la operación está en curso e impedir un segundo clic mientras espera respuesta del servidor.
**Resultado actual:** `eliminar()` y `reactivar()` (en ambas pantallas) no usan ningún estado de tipo `guardando`/`eliminando`; el botón "Eliminar" del `ModalConfirmar` y el botón "Reactivar" de la tabla quedan clicables durante todo el ciclo de la petición.
**Evidencia:** `app/protected/dashboard/codigarios/page.tsx:173-204,361-366` (sin estado de carga en `eliminar`/`reactivar`, comparar con `guardar` en la misma pantalla que sí lo tiene en `:148-171`); mismo patrón en `app/protected/dashboard/codigarios/[id]/page.tsx:227-263`. Es el mismo patrón ya documentado en la auditoría de Distribuciones (`docs/auditoria-ux-distribuciones-2026-08-31.md`, hallazgo del modal de eliminar sin loading).
**Impacto para el usuario:** Riesgo bajo dado que ambos usecases del lado eliminar son idempotentes (`eliminarItem` devuelve `{ok:true, deleted:false}` para un item ya borrado, sin excepción), por lo que un doble clic no rompe nada — pero el usuario no tiene ninguna señal de que el sistema está procesando, especialmente notorio en redes lentas.
**Recomendación:** Reusar el mismo patrón de `guardando` ya implementado para "Guardar cambios" en los handlers de eliminar/reactivar. (NO implementar.)

---

### UX-COD-009 — Los filtros de búsqueda y "Ver inactivos" se pierden al navegar entre listado y detalle
**Prioridad:** P3  **Tipo:** NAVEGACIÓN
**Fuente:** código (inferido)
**Pantalla:** `/codigarios` ↔ `/codigarios/[id]`
**Acción:** Buscar o activar "Ver inactivos" en el listado, entrar al detalle de un codigario, volver con "← Volver".
**Resultado esperado:** Al volver al listado, mantener la búsqueda y el estado de "Ver inactivos" que el usuario había configurado.
**Resultado actual:** `busqueda` y `verInactivos` son estado local de React (`useState`), no reflejado en la URL; al navegar a `/codigarios/[id]` y volver, el componente del listado se remonta desde cero y ambos filtros vuelven a su valor inicial (`""` y `false`).
**Evidencia:** `app/protected/dashboard/codigarios/page.tsx:75-76` (estado local sin persistencia en URL); `:283-285` (link "← Volver" es una navegación completa a la ruta fija `/protected/dashboard/codigarios`, sin querystring).
**Impacto para el usuario:** Fricción menor con workaround claro (volver a escribir la búsqueda); mismo patrón ya señalado en auditorías anteriores de este ciclo para otros módulos.
**Recomendación:** Persistir `busqueda`/`verInactivos` en parámetros de URL si se decide unificar este patrón en todo el sistema. (NO implementar.)

## 7. Pantallas auditadas sin problemas relevantes

- **Validaciones de campos obligatorios** (Nombre, Código, Nombre de item): mensajes claros e inline ("Campo requerido"), no se pierden datos ya cargados al fallar la validación (el formulario permanece abierto con los valores tal cual estaban).
- **Duplicado de nombre de codigario:** validado tanto client-side (contra codigarios activos, excluyendo el que se está editando) como server-side (P2002 → 409 con mensaje claro), sin inconsistencia detectada entre ambos.
- **Manejo de errores de red:** consistente en las ocho operaciones (`try/catch` con `setError("Error de red")`), sin mensajes técnicos ni stack traces expuestos al usuario, y el banner de error se limpia correctamente al reintentar o cancelar.
- **Interpretación de status HTTP:** cada usecase lanza errores tipados (`NombreObligatorioError`, `SinCamposError`, `PorcentajeComputableInvalidoError`, `ItemDuplicadoError`, etc.) que las rutas mapean a códigos HTTP específicos (400/404/409) y el frontend lee el `error.message` del body en todos los casos — no se encontró ningún caso de "backend devuelve error pero la UI no lo muestra".
- **Consistencia visual interna del módulo:** ambas pantallas comparten exactamente el mismo vocabulario (Editar/Eliminar/Reactivar), mismo patrón de tabla, mismo estilo de badge "Inactivo", mismo estilo de banner de error.

## 8. Áreas que no pudieron verificarse (y por qué)

- **Comportamiento visual real** (contraste de badges, alineación, si el banner de error es realmente visible al usuario, si el modal se ve bien en mobile): no hay navegador disponible en esta sesión.
- **Mensaje real que ve un usuario ante una sesión expirada** (`authHeaders.Authorization === "Bearer "` como guarda en los `useEffect` sugiere que existe un estado de "sin auth todavía", pero no se probó en vivo qué pasa si el token expira a mitad de una edición).
- **Conteo real de incidencias afectadas por item** en un tenant con datos reales (para dimensionar cuán frecuente sería el escenario de UX-COD-001 en producción): requeriría datos de `Escuela Primaria N°12` y no se generaron por no haber navegador.
- **Frecuencia real del escenario de UX-COD-002** (codigarios con todos los items inactivos pero sin borrar): no se consultó la base de datos de ningún tenant para confirmar si ya existe algún caso así hoy.

## 9. Lista priorizada de correcciones (sin implementar)

1. **P1 — UX-COD-003:** Distinguir "crear item nuevo" de "reactivar item eliminado con mismo código" en el formulario de alta, en vez de fusionarlos en silencio.
2. **P1 — UX-COD-002:** Unificar el criterio de conteo de items entre la tabla (`_count.items` activos) y el bloqueo de borrado (`tieneItems` total), o al menos alinear el mensaje de error con lo que la pantalla muestra.
3. **P1 — UX-COD-001:** Advertencia explícita de impacto retroactivo antes de guardar un cambio de "% Computable" sobre un item existente, idealmente mostrando cuántas incidencias ya lo usan. Reclasificado de P0 a P1 (ver nota en el hallazgo): disparador de baja frecuencia confirmado por el usuario, pero costo de fix mínimo y agravado por UX-COD-003.
4. **P2 — UX-COD-004:** Corregir el texto "no se puede deshacer" en ambos modales de confirmación, dado que ambas eliminaciones son reversibles vía "Reactivar".
5. **P2 — UX-COD-006:** Aclarar en el formulario qué significa 100%/0% en "% Computable", o quitar el default de 100 para forzar una elección consciente.
6. **P2 — UX-COD-005:** Agregar feedback de éxito, al menos para "Reactivar".
7. **P2 — UX-COD-007:** Arreglar el callejón sin salida de `<div>No encontrado</div>` al acceder a un codigario inactivo por URL directa.
8. **P2 — UX-COD-008:** Estado de carga en "Eliminar" (dentro del modal) y "Reactivar", reusando el patrón ya existente en "Guardar cambios".
9. **P3 — UX-COD-009:** Persistir búsqueda y "Ver inactivos" al navegar entre listado y detalle, si se decide abordar este patrón a nivel de todo el sistema.