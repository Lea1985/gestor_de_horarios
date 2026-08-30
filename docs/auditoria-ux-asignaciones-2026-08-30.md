# Auditoría UX Funcional y Operativa — Módulo Asignaciones

**Fecha:** 2026-08-30
**Alcance:** exclusivamente el módulo Asignaciones (3 de 10 auditorías por módulo). No se auditan Incidencias, Reemplazos, Distribuciones ni ClaseProgramada, salvo en la medida en que Asignaciones los invoca directamente (bloqueos de eliminación/edición, tarjetas de solo-lectura en el detalle).

---

## 1. Resumen ejecutivo

El módulo Asignaciones tiene 3 pantallas reales y una API bien tipada, con buena propagación de errores de negocio en general (mensajes claros, con IDs y fechas concretas en el caso de la incidencia solapada al cambiar titular). Sin embargo, la auditoría encontró **2 hallazgos P0** directamente sobre el eje que pedía este prompt — *cambiar el titular de una asignación y su impacto en el historial* — y una cantidad significativa de deuda de UX/consistencia derivada de un refactor a medio terminar:

1. **"Cambiar titular" no permite fijar una fecha de vigencia** (aunque el caso de uso backend sí la soporta vía `fechaDesde`) y **no explica en ningún lado que la operación cierra el historial de titularidad vigente y abre uno nuevo**. Siempre usa "hoy" como fecha de corte, sin importar cuándo ocurrió realmente el cambio.
2. **No existe ninguna pantalla que muestre el historial de titulares** de una asignación. El endpoint que lo expone (`GET /api/asignaciones/[id]/titular` → `listarTitulares`) existe en el backend pero el frontend nunca lo consume — solo usa el `POST` del mismo endpoint para cambiar titular.

A esto se suma un hallazgo estructural no directamente pedido por el prompt pero que condiciona todo lo demás: en la pantalla de listado (`/asignaciones`), las acciones **Editar, Cambiar titular, Eliminar y Reactivar** están completamente implementadas en el hook `useAsignaciones` (estado, formularios condicionales, `ModalConfirmar`) pero **ningún botón de la tabla las dispara** — son código muerto. La única acción de fila real es "Gestionar", que navega al detalle. Esto no impide operar (todo funciona desde el detalle), pero es evidencia de un refactor incompleto y hace que el resto de los hallazgos de este informe (sobre todo los de "Cambiar titular") solo apliquen al camino real: **detalle → botones del header/TitularCard**.

## 2. Rama y commit auditado; acceso a navegador

- **Rama:** `refactor-clases-programadas-frontend`
- **Commit:** `7b4ea8cdb952f5e093ffe95e4fc6e9b08457b564`
- **Acceso a navegador:** el dev server de Next (`next dev`) está corriendo en `localhost:3000` (verificado con `curl` → `200`), pero **no hay ninguna herramienta de navegador/interacción disponible en este entorno** (sin Playwright ni MCP de browser). No se pudo iniciar sesión ni ejecutar el flujo real, así que **no se generaron datos de prueba** en ningún tenant. Todos los hallazgos están marcados **"Fuente: código (inferido)"**, no "prueba en vivo". Donde el comportamiento en runtime real podría diferir de lo que el código sugiere, se marca explícitamente **RIESGO / NO CONFIRMADO**.

## 3. Alcance auditado (rutas confirmadas en el repo)

Pantallas:
- `app/protected/dashboard/asignaciones/page.tsx`
- `app/protected/dashboard/asignaciones/[id]/page.tsx`
- `app/protected/dashboard/asignaciones/[id]/editar/page.tsx`

API:
- `app/api/asignaciones/route.ts` (GET listar, POST crear)
- `app/api/asignaciones/[id]/route.ts` (GET obtener/tieneHistorial, PATCH actualizar, DELETE eliminar)
- `app/api/asignaciones/[id]/reactivar/route.ts` (POST)
- `app/api/asignaciones/[id]/titular/route.ts` (GET listar titulares — sin consumo en el front, POST cambiar titular)

Use cases: `lib/usecases/asignaciones/{crearAsignacion, actualizarAsignacion, eliminarAsignacion, reactivarAsignacion, cambiarTitularAsignacion, listarAsignaciones, obtenerAsignacion, listarTitulares}.ts`

Repositorios: `lib/repositories/asignacionRepository.ts`, `lib/repositories/titularAsignacionRepository.ts`

Modelos: `Asignacion`, `TitularAsignacion` (`prisma/schema.prisma:281-352`)

No se auditan en profundidad (fuera de alcance, solo como consumidores de solo-lectura desde este módulo): Distribuciones, Incidencias, Reemplazos, ClaseProgramada.

## 4. Inventario de pantallas

### 4.1 `/protected/dashboard/asignaciones` — Listado
- **Objetivo:** ver todas las asignaciones (cargos), buscar, filtrar activas/inactivas, crear una nueva.
- **Rol esperado:** administrativo/directivo con permiso de gestión de cargos.
- **Acciones disponibles realmente:** "+ Nueva asignación" (abre formulario inline), buscar por titular/identificador/documento, checkbox "Ver inactivas", "Gestionar" por fila (navega al detalle).
- **Acciones implementadas pero inalcanzables desde esta pantalla:** Editar, Cambiar titular, Eliminar, Reactivar (ver UX-ASG-006).
- **Formulario:** `AsignacionForm` (creación; también editaría in-line si `abrirEditar` fuera alcanzable).
- **Tabla:** `AsignacionesTable` — columnas Titular vigente, Unidad, Identificador, Contexto, Inicio, acción "Gestionar". Badge "Inactivo" cuando `!a.activo`.
- **Modal:** `ModalConfirmar` para eliminar — condicionado por `confirmarId`, que nunca se setea desde esta pantalla (ver UX-ASG-006).
- **Mensajes:** banner de error con botón de cierre; contador de resultados ("N asignación(es) activa(s)").

### 4.2 `/protected/dashboard/asignaciones/[id]` — Detalle
- **Objetivo:** ver y operar sobre una asignación puntual: titular vigente, datos del cargo, distribuciones e incidencias asociadas.
- **Rol esperado:** igual que arriba.
- **Acciones disponibles:** Editar (navega a `/editar`), Eliminar (con confirmación), Reactivar (si está eliminada, con confirmación), Cambiar titular (inline, sin confirmación).
- **Formulario inline:** `CambiarTitularForm` (solo select de agente, sin fecha).
- **Tarjetas:** `TitularCard` (titular vigente + botón "Cambiar titular"), `CargoCard` (unidad, fechas, comisión/turno/materia), `DistribucionesCard` (tabla, navega a módulos), `IncidenciasCard` (tabla, navega a la incidencia).
- **Modales:** `ModalConfirmar` para eliminar y para reactivar (dos instancias distintas, textos distintos).
- **Mensajes:** banner de error con botón de cierre; badges de estado ("ACTIVO"/otro), "Eliminada", "Inactivo".
- **Navegación posterior:** "← Volver a asignaciones" en el header.

### 4.3 `/protected/dashboard/asignaciones/[id]/editar` — Edición dedicada
- **Objetivo:** editar campos estructurales de una asignación (o solo fecha de cese, si tiene historial).
- **Rol esperado:** igual que arriba.
- **Acciones:** Guardar cambios, Cancelar (`router.back()`), "← Volver".
- **Formulario:** `EditarAsignacionForm` — todos los campos estructurales si `!restringido`; solo "Fecha de cese" si `restringido`.
- **Mensajes:** banner de error; banner de aviso amarillo si `restringido`, con texto distinto al de `AsignacionForm` (ver UX-ASG-012).

## 5. Mapa PANTALLA → ACCIÓN → API/USECASE → RESULTADO ESPERADO

| Pantalla | Acción | API / UseCase | Resultado esperado |
|---|---|---|---|
| Listado | Crear asignación | `POST /api/asignaciones` → `crearAsignacion` | Crea `Asignacion` (+ `TitularAsignacion` inicial si hay agente); refresca lista; cierra formulario |
| Listado | Buscar / Ver inactivas | client-side filter + `GET /api/asignaciones?inactivas=` → `listarAsignaciones` | Filtra por texto (titular/identificador/documento) y por `activo`/`deletedAt` |
| Detalle | Editar (navega) | `GET /api/asignaciones/[id]` → `obtenerAsignacion` | Precarga formulario dedicado |
| Editar | Guardar cambios | `PATCH /api/asignaciones/[id]` → `actualizarAsignacion` | Actualiza campos estructurales o solo `fecha_fin` si hay historial; `router.push` al detalle |
| Detalle | Cambiar titular | `POST /api/asignaciones/[id]/titular` → `cambiarTitularAsignacion` | Cierra `TitularAsignacion` vigente (`fecha_hasta` = día anterior), crea una nueva desde "hoy"; recarga detalle |
| Detalle | Eliminar | `DELETE /api/asignaciones/[id]` → `eliminarAsignacion` | Soft-delete (`deletedAt`, `activo=false`, `estado=INACTIVO`), cierra titularidad vigente, suspende clases futuras; navega al listado |
| Detalle | Reactivar | `POST /api/asignaciones/[id]/reactivar` → `reactivarAsignacion` | `activo=true`, `deletedAt=null`, `estado=ACTIVO`; reabre última titularidad cerrada; re-resuelve clases en `FIN_ASIGNACION` |
| *(sin pantalla)* | Ver historial de titulares | `GET /api/asignaciones/[id]/titular` → `listarTitulares` | Historial completo ordenado por `fecha_desde desc` — **implementado en backend, no consumido por ninguna pantalla** |

## 6. Matriz de acciones críticas (ciclo completo)

| Acción | Estado inicial | Validación | Feedback éxito | Feedback error | Reversible desde UI |
|---|---|---|---|---|---|
| Crear | Formulario vacío | Frontend: campos requeridos por HTML; Backend: fechas, duplicado, entidades existentes, coherencia turno↔comisión | Cierra formulario, refresca lista (sin mensaje de éxito explícito) | `setError` con mensaje del backend; formulario permanece abierto con los datos ya cargados | Eliminar (soft) |
| Editar (dedicada) | Formulario precargado | Backend: `EdicionRestringidaError` si hay historial y se tocan campos estructurales; **sin validar turno↔comisión** | `router.push` al detalle (sin mensaje de éxito explícito) | `setError`; el formulario sigue montado | N/A (edición) |
| Cambiar titular | Select con titular actual preseleccionado | Backend: agente existe, fecha válida, **no permite si hay incidencia activa solapada** (mensaje con ID y fecha) | Cierra formulario inline, recarga detalle (sin mensaje de éxito explícito) | `setError` con mensaje del backend | **No** — no hay "deshacer cambio de titular"; solo otro cambio de titular manual |
| Eliminar | — | Backend: bloquea si incidencias activas o reemplazos activos | `ModalConfirmar` se cierra, navega al listado (detalle) o refresca (lista, inalcanzable) | `setError`; modal se cierra igual | **Sí**, vía Reactivar |
| Reactivar | Asignación eliminada | Backend: debe existir eliminada | Recarga detalle / actualiza fila en memoria (lista, inalcanzable) | `setError` | N/A |

## 7. Hallazgos

### P0

#### UX-ASG-001 — "Cambiar titular" no permite fijar fecha de vigencia ni explica el efecto sobre el historial
**Prioridad:** P0  **Tipo:** FORMULARIO / VALIDACIÓN DE NEGOCIO / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Detalle de asignación (`TitularCard` → `CambiarTitularForm`)
**Acción:** Cambiar titular
**Resultado esperado:** El caso de uso `cambiarTitularAsignacion(asignacionId, tenantId, agenteId, fechaDesde?)` (`lib/usecases/asignaciones/cambiarTitularAsignacion.ts:7-11`) acepta explícitamente una fecha de vigencia (`fechaDesde`), y la ruta `POST /api/asignaciones/[id]/titular` la reenvía desde `body.fechaDesde` (`app/api/asignaciones/[id]/titular/route.ts:79`). El diseño del caso de uso asume que un operador puede registrar un cambio de titular que ocurrió en el pasado (ej. "el suplente asumió el lunes pasado, recién hoy lo cargo") sin distorsionar el historial.
**Resultado actual:** `CambiarTitularForm.tsx` solo tiene un `<select>` de agente (líneas 44-67); no existe ningún campo de fecha. `asignacionesService.cambiarTitular(id, agenteId, headers)` (`features/asignaciones/services/asignacionesService.ts:89-99`) nunca envía `fechaDesde`. En consecuencia, el backend siempre usa `new Date()` como corte (`cambiarTitularAsignacion.ts:26`): cierra la titularidad vigente el día anterior a "hoy" y abre la nueva "hoy", sin importar cuándo ocurrió el cambio real. Tampoco hay ningún texto en la pantalla que explique que esta acción reescribe el historial (cierra un `TitularAsignacion` y abre otro).
**Evidencia:** `features/asignaciones/components/CambiarTitularForm.tsx:1-86`; `features/asignaciones/services/asignacionesService.ts:89-99`; `lib/usecases/asignaciones/cambiarTitularAsignacion.ts:7-33`; `app/api/asignaciones/[id]/titular/route.ts:74-80`
**Impacto para el usuario:** Todo cambio de titular cargado con retraso (algo común en administración escolar) queda registrado con la fecha equivocada en el historial, y nada en la pantalla avisa que eso está pasando ni ofrece forma de corregirlo. El historial de titularidad — que existe específicamente para poder responder "¿quién era el titular el día X?" — queda silenciosamente desalineado con la realidad.
**Recomendación:** Agregar un campo de fecha (opcional, con "hoy" como default visible) en `CambiarTitularForm`, y un texto explícito tipo "Este cambio cierra la titularidad actual el día anterior a la fecha elegida y abre una nueva desde esa fecha". (NO implementar — solo documentar.)

---

#### UX-ASG-002 — No existe ninguna pantalla que muestre el historial de titulares de una asignación
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE / NAVEGACIÓN
**Fuente:** código (inferido)
**Pantalla:** Detalle de asignación (ausente en toda la app)
**Acción:** Consultar quién fue titular de un cargo y en qué período
**Resultado esperado:** `listarTitulares(asignacionId, tenantId)` (`lib/usecases/asignaciones/listarTitulares.ts`) devuelve el historial completo vía `titularAsignacionRepository.listar`, ordenado por `fecha_desde desc` (`lib/repositories/titularAsignacionRepository.ts:20-30`), expuesto en `GET /api/asignaciones/[id]/titular`. Es información ya modelada y disponible para consumo.
**Resultado actual:** Búsqueda confirmada en todo `features/` y `app/protected`: la única referencia a `/api/asignaciones/[id]/titular` en el frontend es el `POST` de `asignacionesService.cambiarTitular` (`features/asignaciones/services/asignacionesService.ts:90`). Ningún componente hace `GET` a ese endpoint. `TitularCard` solo muestra el titular vigente (`features/asignaciones/components/TitularCard.tsx:56-73`); no hay tabla de historial, ni siquiera un link "Ver historial".
**Evidencia:** `lib/usecases/asignaciones/listarTitulares.ts`; `lib/repositories/titularAsignacionRepository.ts:16-30`; `app/api/asignaciones/[id]/titular/route.ts:22-48` (GET implementado); ausencia confirmada por búsqueda de `listarTitulares`/`/titular` en `features/` y `app/protected`
**Impacto para el usuario:** Sumado a UX-ASG-001, esto significa que un operador no tiene forma de: (a) verificar que un cambio de titular quedó registrado con la fecha correcta, (b) responder "¿quién era el titular en marzo?" sin ir a la base de datos, o (c) detectar el problema descrito en UX-ASG-004 (registros de historial espurios). El sistema guarda esta información pero la vuelve invisible para quien opera.
**Recomendación:** Agregar una tabla de historial de titulares en la pantalla de detalle (similar a `DistribucionesCard`/`IncidenciasCard`), consumiendo el `GET` ya existente. (NO implementar.)

### P1

#### UX-ASG-003 — "Cambiar titular" no tiene modal de confirmación, a diferencia de Eliminar y Reactivar
**Prioridad:** P1  **Tipo:** ACCIÓN DESTRUCTIVA / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Detalle de asignación
**Acción:** Cambiar titular
**Resultado esperado:** Dado que la acción reescribe un registro histórico y no tiene "deshacer" real desde la UI (ver UX-ASG-002), sería consistente con el resto del módulo pedir confirmación, como se hace para Eliminar y Reactivar.
**Resultado actual:** En `app/protected/dashboard/asignaciones/[id]/page.tsx:83-97`, `CambiarTitularForm` se guarda directamente al hacer click en "Guardar" (`guardarCambioTitular`, `features/asignaciones/hooks/useAsignacionDetalle.ts:148-162`), sin pasar por `ModalConfirmar`. Eliminar (línea 49-55) y Reactivar (línea 56-63) sí usan `ModalConfirmar` en la misma pantalla.
**Evidencia:** `app/protected/dashboard/asignaciones/[id]/page.tsx:49-63` (Eliminar/Reactivar con modal) vs `83-97` (Cambiar titular sin modal)
**Impacto para el usuario:** Clasificación de riesgo: **RIESGO ALTO**. Un click accidental en "Guardar" del formulario de cambio de titular (por ejemplo, mientras se estaba solo revisando quién es el titular actual) modifica el historial sin ningún paso intermedio de confirmación, y sin aviso de que "esto no se puede deshacer con un botón".
**Recomendación:** Agregar un paso de confirmación (o al menos un resumen "vas a cambiar el titular de X a Y desde la fecha Z") antes de ejecutar. (NO implementar.)

---

#### UX-ASG-004 — Guardar "Cambiar titular" sin modificar la selección crea un registro de historial espurio
**Prioridad:** P1  **Tipo:** VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido) — **RIESGO / NO CONFIRMADO** en cuanto a frecuencia real de uso; el camino de código sí está confirmado.
**Pantalla:** Detalle de asignación
**Acción:** Cambiar titular
**Resultado esperado:** Si el agente seleccionado es el mismo que ya es titular vigente, la operación debería ser un no-op (o al menos advertir), para no fragmentar el historial con dos períodos consecutivos de la misma persona sin cambio real.
**Resultado actual:** `abrirCambiarTitular` preselecciona el titular actual en el formulario (`useAsignacionDetalle.ts:128-140`, `agenteId` = titular actual). `cambiarTitularAsignacion.ts` (líneas 59-98) no compara `agenteId` contra el titular vigente antes de cerrar el `TitularAsignacion` actual y crear uno nuevo: si el usuario abre el formulario y confirma sin cambiar nada, se cierra la titularidad vigente (`fecha_hasta` = ayer) y se crea una nueva para la misma persona (`fecha_desde` = hoy).
**Evidencia:** `features/asignaciones/hooks/useAsignacionDetalle.ts:128-140`; `lib/usecases/asignaciones/cambiarTitularAsignacion.ts:59-98` (sin chequeo de `agenteId === titular vigente`)
**Impacto para el usuario:** El historial de titularidad, que debería reflejar cambios reales de persona, puede terminar con cortes artificiales sin que haya habido ningún cambio, sin que el sistema avise. Empeora con UX-ASG-002 (no hay pantalla donde notarlo) y UX-ASG-003 (no hay confirmación que dé una segunda oportunidad de cancelar).
**Recomendación:** Comparar `agenteId` contra el titular vigente antes de ejecutar el cambio; si es igual, no crear un nuevo registro (o mostrar un aviso "ya es el titular actual"). (NO implementar.)

---

#### UX-ASG-005 — El mensaje de confirmación de "Eliminar" en el listado dice que la acción "no se puede deshacer", pero sí se puede
**Prioridad:** P1  **Tipo:** MENSAJE / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Listado (inalcanzable, ver UX-ASG-006) y Detalle
**Acción:** Eliminar asignación
**Resultado esperado:** El texto de confirmación debería describir con precisión lo que va a pasar. `docs/reglas_negocio.md:269` es explícito: *"Las asignaciones pueden inactivarse, pero no eliminarse si poseen historial"* — es decir, la operación real es una inactivación (soft-delete), reversible, tal como implementa `asignacionRepository.softDelete` (`deletedAt`, `activo=false`, cierra titularidad) y confirma la existencia misma de `reactivarAsignacion`.
**Resultado actual:** Dos textos distintos para la misma acción en el mismo módulo:
- Listado: *"¿Eliminar esta asignación? Esta acción no se puede deshacer."* (`app/protected/dashboard/asignaciones/page.tsx:37`) — **esto es falso**: existe "Reactivar" (`AsignacionDetalleHeader.tsx:68-74`) que revierte exactamente esta operación.
- Detalle: *"¿Eliminar esta asignación? Se eliminará toda su información asociada."* (`app/protected/dashboard/asignaciones/[id]/page.tsx:51`) — también inexacto: no se elimina la información asociada (distribuciones, incidencias, clases quedan intactas; solo se suspenden clases futuras), y el propio botón "Eliminar" está deshabilitado si hay incidencias activas, precisamente para no perder esa información.
**Evidencia:** `app/protected/dashboard/asignaciones/page.tsx:37`; `app/protected/dashboard/asignaciones/[id]/page.tsx:51`; `lib/repositories/asignacionRepository.ts:133-171` (softDelete); `docs/reglas_negocio.md:269`
**Impacto para el usuario:** Un mensaje que exagera la irreversibilidad puede frenar a un usuario de una acción legítima y fácilmente reversible; el otro mensaje sugiere pérdida de datos que no ocurre. Ninguno de los dos comunica lo que realmente pasa (se inactiva, se puede reactivar, las clases futuras se suspenden). Además, la inconsistencia entre pantallas del mismo módulo rompe la previsibilidad.
**Recomendación:** Unificar un solo texto preciso, algo como "¿Eliminar esta asignación? Quedará inactiva y se suspenderán sus clases futuras; podés reactivarla después." (NO implementar.)

---

#### UX-ASG-006 — Las acciones Editar, Cambiar titular, Eliminar y Reactivar del listado están implementadas pero ningún control las dispara
**Prioridad:** P1  **Tipo:** NAVEGACIÓN / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Listado
**Acción:** Editar / Cambiar titular / Eliminar / Reactivar directamente desde una fila de la tabla
**Resultado esperado:** Si el hook `useAsignaciones` implementa `abrirEditar`, `abrirCambiarTitular`, `eliminar`, `reactivar`, `confirmarId`/`setConfirmarId`, y `page.tsx` renderiza condicionalmente `AsignacionForm` (modo edición), `CambiarTitularForm` y `ModalConfirmar` en base a ese estado, se esperaría que la tabla ofreciera alguna forma de dispararlos por fila.
**Resultado actual:** `AsignacionesTable` (`features/asignaciones/components/AsignacionesTable.tsx:28-31`) solo recibe `asignaciones` y `verInactivas` como props, y su única acción por fila es "Gestionar" (navega al detalle, línea 86-91). `app/protected/dashboard/asignaciones/page.tsx` destructura `abrirEditar`, `abrirCambiarTitular`, `reactivar`, `setConfirmarId` (líneas 23-24) pero **ninguno se invoca en el JSX**: el único handler conectado es `abrirCrear` (línea 58). Por lo tanto `mostrarForm` en modo edición, `mostrarCambioTitular` y el `ModalConfirmar` de eliminar (condicionado por `confirmarId !== null`, línea 35) nunca pueden activarse desde esta pantalla.
**Evidencia:** `app/protected/dashboard/asignaciones/page.tsx:13-133` (comparar destructuring líneas 14-25 contra el JSX); `features/asignaciones/components/AsignacionesTable.tsx:28-100`
**Impacto para el usuario:** No hay pérdida funcional (todo es alcanzable vía "Gestionar" → detalle), pero el usuario debe hacer una navegación extra para cualquier operación sobre una fila, mientras el propio código sugiere que la intención de diseño original era permitirlo desde la tabla. Riesgo de mantenimiento: si alguien reconecta estos handlers sin revisar la lógica de "tiene historial" usada en el detalle/editar (ver UX-ASG-007), puede reintroducir inconsistencias ya resueltas en otra parte del código.
**Recomendación:** Decidir explícitamente si el listado debe tener acciones de fila (y conectarlas) o si se elimina el código muerto (`abrirEditar`, `abrirCambiarTitular`, `reactivar`, `confirmarId` en `useAsignaciones.ts` y los renders condicionales asociados en `page.tsx`) para no confundir a futuros desarrolladores. (NO implementar — es una decisión de producto, no solo de limpieza.)

---

#### UX-ASG-007 — Tres cálculos independientes de "tiene historial / edición restringida" que pueden divergir
**Prioridad:** P1  **Tipo:** CONSISTENCIA / VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido) — **RIESGO / NO CONFIRMADO** sobre si el escenario de divergencia concreto (ClaseProgramada sin distribuciones/incidencias/titularidades) es alcanzable con los flujos de generación actuales; requeriría prueba en vivo con datos reales.
**Pantalla:** Detalle y Editar
**Acción:** Determinar si la edición estructural debe bloquearse
**Resultado esperado:** Un único criterio de "tiene historial", usado de forma consistente en todos los lugares donde se decide si mostrar el aviso de bloqueo y si el backend va a aceptar la edición.
**Resultado actual:** Tres implementaciones distintas del mismo concepto:
1. **Backend, fuente de verdad real** (`asignacionRepository.tieneEntidadesRelacionadas`, `lib/repositories/asignacionRepository.ts:71-94`): `distribuciones > 0 || incidencias > 0 || ClaseProgramada > 0`. Es lo que efectivamente usa `actualizarAsignacion` para lanzar `EdicionRestringidaError` (`lib/usecases/asignaciones/actualizarAsignacion.ts:64-71`).
2. **Detalle** (`useAsignacionDetalle.ts:176-179`): `tieneHistorial = distribuciones.length > 0 || incidencias.length > 0` — **no considera `ClaseProgramada`**. Controla el aviso `motivoBloqueoEditar` mostrado en `AsignacionDetalleHeader`.
3. **Editar dedicado** (`useEditarAsignacion.ts:66-70`): `restringido = distribuciones.length > 0 || incidencias.length > 0 || titularidades.length > 0` — usa `titularidades` como proxy en vez de `ClaseProgramada`.
**Evidencia:** `lib/repositories/asignacionRepository.ts:71-94`; `features/asignaciones/hooks/useAsignacionDetalle.ts:176-182`; `features/asignaciones/hooks/useEditarAsignacion.ts:66-70`
**Impacto para el usuario:** Si una asignación tiene `ClaseProgramada` pero (hipotéticamente) no distribuciones/incidencias/titularidades registradas del lado del cliente, el detalle mostraría el "Editar" sin ninguna advertencia, y recién en `/editar` — o incluso al guardar — el usuario se enteraría de la restricción real. Aun si ese escenario exacto no ocurre en la práctica actual (dado el pipeline `Distribucion → ClaseProgramada` documentado en las reglas de negocio), tener tres definiciones distintas del mismo concepto de negocio es una fuente de bugs futura cada vez que cambie alguna.
**Recomendación:** Unificar en una sola fuente (reusar `tieneEntidadesRelacionadas` vía el endpoint `?historial=true` que el listado ya usa) en las tres pantallas. (NO implementar.)

---

#### UX-ASG-008 — `actualizarAsignacion` no valida coherencia turno↔comisión al editar, a diferencia de `crearAsignacion`
**Prioridad:** P1  **Tipo:** VALIDACIÓN DE NEGOCIO
**Fuente:** código (inferido)
**Pantalla:** Editar
**Acción:** Guardar cambios estructurales (sin historial)
**Resultado esperado:** `crearAsignacion.ts:85-92` valida que, si se especifica una comisión, su `turnoId` y `unidadId` coincidan con los del formulario ("El turno no coincide con la comisión" / "La unidad no coincide con la comisión"). Sería esperable la misma validación al editar.
**Resultado actual:** `actualizarAsignacion.ts` (líneas 106-121) asigna `comisionId` y `turnoId` de forma completamente independiente, sin ninguna verificación cruzada. `EditarAsignacionForm.tsx` refuerza el problema del lado de la UI: muestra "Comisión" (líneas 110-115) y "Turno" (líneas 132-138) como dos `<select>` independientes que no se recalculan entre sí — a diferencia de `AsignacionForm.tsx` (creación), que directamente **oculta** el select de Turno cuando la unidad tiene comisiones (`unidadTieneComisiones`, líneas 166-213) porque el turno se deriva de la comisión elegida (`onComisionChange`, `useAsignaciones.ts:114-131`).
**Evidencia:** `lib/usecases/asignaciones/crearAsignacion.ts:85-92` (validación presente) vs `lib/usecases/asignaciones/actualizarAsignacion.ts:106-121` (ausente); `features/asignaciones/components/EditarAsignacionForm.tsx:110-138`; `features/asignaciones/components/AsignacionForm.tsx:166-213`
**Impacto para el usuario:** Desde `/editar`, un usuario puede guardar una asignación con una comisión de un turno y un turno distinto seleccionado por separado, sin ningún error — quedando datos estructuralmente inconsistentes que sí se previenen al crear.
**Recomendación:** Aplicar la misma validación cruzada en `actualizarAsignacion`, y/o hacer que `EditarAsignacionForm` derive el turno de la comisión igual que el formulario de creación. (NO implementar.)

### P2

#### UX-ASG-009 — El botón "Eliminar" del detalle no anticipa el bloqueo por reemplazos activos, solo por incidencias
**Prioridad:** P2  **Tipo:** VALIDACIÓN UX
**Fuente:** código (inferido)
**Pantalla:** Detalle
**Acción:** Eliminar asignación
**Resultado esperado:** El estado `disabled`/aviso del botón "Eliminar" debería reflejar todas las condiciones que el backend va a evaluar.
**Resultado actual:** `eliminarAsignacion.ts` bloquea por dos reglas: incidencias activas (líneas 19-27) **y** reemplazos activos (líneas 29-39, `TieneReemplazosActivosError`). El cliente (`useAsignacionDetalle.ts:172-174`) solo replica la primera: `motivoBloqueoEliminar` se calcula únicamente de `tieneIncidenciasActivas`. Si la asignación tiene reemplazos activos pero no incidencias activas, el botón "Eliminar" aparece habilitado y sin aviso.
**Evidencia:** `lib/usecases/asignaciones/eliminarAsignacion.ts:19-39`; `features/asignaciones/hooks/useAsignacionDetalle.ts:172-174`
**Impacto para el usuario:** El usuario puede confirmar la eliminación (pasa por `ModalConfirmar`, cree que va a funcionar) y recién ahí enterarse por el mensaje de error del backend ("No se puede eliminar una asignación con reemplazos activos") de que no era posible. El error sí se muestra (no es un caso de "backend falla y la UI no dice nada"), pero la fricción y la falsa sensación de "esto va a andar" se podrían evitar.
**Recomendación:** Extender el chequeo cliente para incluir reemplazos activos, o directamente pedirle al backend ese dato junto con la asignación. (NO implementar.)

---

#### UX-ASG-010 — `IncidenciasCard` muestra todas las incidencias sin distinguir activas/eliminadas
**Prioridad:** P2  **Tipo:** ESTADO / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Detalle
**Acción:** Ver incidencias asociadas a la asignación
**Resultado esperado:** Si una incidencia fue eliminada (soft-delete, `deletedAt` seteado — confirmado en `incidenciaRepository.eliminar`, que setea `activo:false` y `deletedAt` juntos), debería quedar claro en la tabla que ya no es una incidencia vigente, igual que `AsignacionesTable` marca "Inactivo" para asignaciones no activas.
**Resultado actual:** `asignacionRepository.obtenerPorId` incluye `incidencias: true` sin ningún filtro por `deletedAt` (`lib/repositories/asignacionRepository.ts:50-57`). `IncidenciasCard.tsx` (líneas 31-84) renderiza todas las filas recibidas sin ningún badge de estado — ni "activo", ni "eliminada" — a diferencia de `AsignacionesTable`, que sí distingue asignaciones inactivas.
**Evidencia:** `lib/repositories/asignacionRepository.ts:50-57`; `features/asignaciones/components/IncidenciasCard.tsx:31-84`; confirmado que `deletedAt` se setea en el soft-delete de incidencias en `lib/repositories/incidenciaRepository.ts:309-328`
**Impacto para el usuario:** Con datos reales de suficiente antigüedad, la tarjeta "Incidencias" del detalle de una asignación puede mostrar mezcladas incidencias vigentes y eliminadas, sin forma de distinguirlas a simple vista — el contador ("N registradas") tampoco aclara cuántas de esas siguen vigentes.
**Recomendación:** Filtrar por `deletedAt: null` en el include, o agregar un badge de estado por fila igual que en la tabla de asignaciones. (NO implementar.)

---

#### UX-ASG-011 — El campo `estado` (ACTIVO/INACTIVO/SUSPENDIDO) nunca es editable desde ninguna UI
**Prioridad:** P2  **Tipo:** FORMULARIO / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Editar / Detalle
**Acción:** Cambiar el estado de una asignación
**Resultado esperado:** El backend acepta `body.estado` en `actualizarAsignacion.ts:106-108`, y el enum `Estado` (`prisma/schema.prisma:12-16`) tiene tres valores (`ACTIVO`, `INACTIVO`, `SUSPENDIDO`). El detalle muestra un badge de `estado` en el header (`AsignacionDetalleHeader.tsx:5-17`). Se esperaría alguna forma de que un usuario setee, por ejemplo, `SUSPENDIDO`.
**Resultado actual:** Ni `AsignacionForm` ni `EditarAsignacionForm` tienen un campo para `estado`. El único código que lo modifica es interno: `crearAsignacion` (default `ACTIVO`), `eliminarAsignacion`/`asignacionRepository.softDelete` (fuerza `INACTIVO`), `reactivarAsignacion`/`asignacionRepository.reactivar` (fuerza `ACTIVO`). `SUSPENDIDO` no es alcanzable desde ninguna pantalla. Además, conviven dos nociones de "activo" sin relación explícita en la UI: el enum `estado` (mostrado como badge) y el booleano `activo` + `deletedAt` (que gobierna Eliminar/Reactivar y el badge "Inactivo" de la tabla).
**Evidencia:** `prisma/schema.prisma:12-16` (enum), `lib/usecases/asignaciones/actualizarAsignacion.ts:106-108` (acepta `estado`), `features/asignaciones/components/AsignacionForm.tsx` y `EditarAsignacionForm.tsx` (sin campo `estado`), `features/asignaciones/components/AsignacionDetalleHeader.tsx:5-17` (badge de solo lectura)
**Impacto para el usuario:** El estado `SUSPENDIDO` parece una capacidad de negocio sin UI terminada; y tener dos campos de "estado" distintos (`estado` enum vs. `activo`/`deletedAt`) sin ninguna explicación en pantalla puede confundir a quien lea el badge y no entienda por qué "Eliminar"/"Reactivar" tocan un campo distinto al que se muestra.
**Recomendación:** Definir si `SUSPENDIDO` es un estado que debe poder setearse manualmente (y agregarlo a los formularios) o si es vestigial y debería documentarse/removerse. (NO implementar — requiere decisión de negocio.)

---

#### UX-ASG-012 — Dos formularios de edición paralelos con avisos de bloqueo redactados de forma distinta
**Prioridad:** P2  **Tipo:** CONSISTENCIA / MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Listado (inalcanzable, ver UX-ASG-006) y Editar dedicado
**Acción:** Editar asignación con historial
**Resultado esperado:** Un único texto y una única implementación para "esta asignación tiene historial, por eso no podés editar todo".
**Resultado actual:** Dos componentes, dos redacciones distintas para la misma restricción:
- `AsignacionForm.tsx:85-89`: *"Los campos estructurales están bloqueados porque esta asignación tiene historial (distribuciones, incidencias o clases programadas). Solo podés modificar fecha fin y estado."* — pero no hay ningún campo "estado" visible en ese mismo formulario (ver UX-ASG-011), así que la frase promete algo que la pantalla no ofrece.
- `EditarAsignacionForm.tsx:67-71`: *"Esta asignación tiene historial. Solo se puede modificar la fecha de cese. Para cambiar el titular, usá la opción 'Cambio titular' desde la lista."* — pero la vía real para cambiar titular es un botón en `TitularCard` del **detalle**, no "desde la lista" (que además está inalcanzable, UX-ASG-006).
**Evidencia:** `features/asignaciones/components/AsignacionForm.tsx:84-89`; `features/asignaciones/components/EditarAsignacionForm.tsx:66-72`
**Impacto para el usuario:** Fricción menor (el bloqueo en sí funciona en ambos casos), pero el texto de `EditarAsignacionForm` da una instrucción de navegación incorrecta ("desde la lista"), y el de `AsignacionForm` menciona una capacidad ("estado") que no está implementada en esa pantalla.
**Recomendación:** Unificar el texto y corregir la referencia de navegación a "desde el detalle de la asignación". (NO implementar.)

### P3

#### UX-ASG-013 — Falta de guard síncrono contra doble click antes de que el estado `guardando` se refleje
**Prioridad:** P3  **Tipo:** CARGA
**Fuente:** código (inferido) — **RIESGO / NO CONFIRMADO**, requiere prueba en vivo (doble click real) para confirmar si React alcanza a re-renderizar a tiempo.
**Pantalla:** Listado (crear/editar inalcanzable), Detalle (cambiar titular), Editar
**Acción:** Guardar (cualquier formulario)
**Resultado esperado:** Un doble click rápido en "Guardar"/"Crear asignación" no debería poder disparar dos requests.
**Resultado actual:** Los botones de guardado (`AsignacionForm.tsx:223-229`, `CambiarTitularForm.tsx:75-81`, `EditarAsignacionForm.tsx:166-172`) se deshabilitan vía `disabled={guardando}`, pero `guardando` se setea con `setGuardando(true)` como primera línea *dentro* de la función async del handler, no de forma síncrona en el `onClick`. En React esto normalmente alcanza a prevenir un segundo submit por el batching de eventos, pero no hay una guarda explícita (ej. flag de módulo o `useRef`) que lo garantice independientemente del comportamiento de scheduling.
**Evidencia:** `features/asignaciones/hooks/useAsignaciones.ts:192-194` (`guardarAsignacion`), `254-256` (`guardarCambioTitular`); `features/asignaciones/hooks/useEditarAsignacion.ts:102-105` (`guardar`)
**Impacto para el usuario:** Bajo — es el patrón estándar de React y probablemente suficiente en la práctica. Se documenta por completitud, no por evidencia de fallo real.
**Recomendación:** No priorizar; si se quiere blindar, usar un `useRef` como guarda adicional. (NO implementar.)

## 8. Pantallas/flujos auditados sin problemas relevantes

- **Creación de asignación (`AsignacionForm`, modo creación):** el campo "Agente" está claramente marcado como opcional con la consecuencia explicada inline ("vacante si no se selecciona"); los campos obligatorios llevan asterisco; al fallar (ej. identificador duplicado → 409), el formulario permanece abierto con los datos ya cargados (`guardarAsignacion` no llama a `cancelar()` en el `catch`) — no hay pérdida de trabajo del usuario.
- **Bloqueo de cambio de titular por incidencia activa solapada** (`cambiarTitularAsignacion.ts:35-57`): el mensaje de error incluye el ID de la incidencia y la fecha hasta la que está activa, con una sugerencia concreta de qué hacer ("Esperá a que finalice o edítala"). Es uno de los mejores mensajes de error de negocio del módulo.
- **`CargoCard` / `DistribucionesCard`:** presentación clara de "Indefinida" para fechas nulas, badges de estado consistentes con el resto de la app, navegación directa a módulos por versión de distribución.
- **`AsignacionFilters`:** simple, sin ambigüedad — un input de texto y un checkbox, sin estados intermedios confusos.
- **Reactivación (`reactivarAsignacion.ts`):** re-resuelve una por una las clases que habían quedado en `FIN_ASIGNACION`, en vez de asumir que todas vuelven a `PROGRAMADA` — maneja correctamente el caso de que haya cambiado el período vigente desde que se eliminó.

## 9. Áreas que no pudieron verificarse

- **Todo el comportamiento en runtime real** (estados de loading visual, timing de spinners, si un doble click real dispara dos requests, si los mensajes de error se ven legibles en la UI real, si el flujo de autenticación/`authHeaders` funciona como asume el código): no hay herramienta de navegador disponible en este entorno pese a que el dev server está corriendo. No se generaron datos de prueba en ningún tenant.
- **UX-ASG-007** (tres cálculos de "tiene historial"): confirmado que el código difiere en tres lugares; no confirmado si el escenario concreto de divergencia (ClaseProgramada sin distribuciones/incidencias/titularidades) es alcanzable con los flujos de generación actuales de `ClaseProgramada`.
- **UX-ASG-010** (incidencias eliminadas visibles): confirmado el código (include sin filtro + sin badge); no confirmado visualmente cómo se ve con datos reales de un tenant con incidencias eliminadas.
- **UX-ASG-013** (doble submit): no confirmado si es explotable en la práctica.
- **Permisos por rol:** no se encontró en este módulo ningún control de permisos más allá de `withContext` (autenticación/tenant); no se pudo confirmar si existen distintos roles con distinto acceso a estas pantallas, ni cómo se comporta la UI para un rol sin permiso de escritura.

## 10. Lista priorizada de correcciones (sin implementar)

1. **UX-ASG-001** — Agregar campo de fecha de vigencia a "Cambiar titular" y enviarlo al backend.
2. **UX-ASG-002** — Agregar vista de historial de titulares en el detalle, consumiendo el `GET` ya implementado.
3. **UX-ASG-003** — Agregar confirmación (o resumen previo) antes de guardar un cambio de titular.
4. **UX-ASG-004** — Evitar crear un registro de historial cuando el titular seleccionado es el mismo que el vigente.
5. **UX-ASG-005** — Unificar y corregir el texto de confirmación de "Eliminar" en ambas pantallas.
6. **UX-ASG-006** — Decidir si el listado tiene acciones de fila (conectarlas) o retirar el código muerto.
7. **UX-ASG-007** — Unificar el cálculo de "tiene historial" en una sola fuente.
8. **UX-ASG-008** — Validar coherencia turno↔comisión también al editar.
9. **UX-ASG-009** — Anticipar en el cliente el bloqueo de eliminación por reemplazos activos.
10. **UX-ASG-010** — Filtrar o marcar incidencias eliminadas en `IncidenciasCard`.
11. **UX-ASG-011** — Definir el futuro del campo `estado`/`SUSPENDIDO` en la UI.
12. **UX-ASG-012** — Unificar los textos de aviso de edición restringida.
13. **UX-ASG-013** — (opcional, bajo impacto) reforzar guard contra doble submit.
