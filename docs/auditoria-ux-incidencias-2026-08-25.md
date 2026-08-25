# Auditoría UX Funcional y Operativa — Módulo Incidencias

**Fecha:** 2026-08-25
**Alcance:** exclusivamente el módulo Incidencias (1 de 10 auditorías por módulo). No se auditan Reemplazos, Asignaciones, Distribuciones ni otros módulos, salvo en la medida en que Incidencias los invoca directamente (creación/eliminación de reemplazos desde la propia pantalla de incidencia).

---

## 1. Resumen ejecutivo

El módulo Incidencias está bien resuelto en su núcleo transaccional: creación, edición, eliminación (soft-delete) y reactivación tienen reglas de negocio claras en los use cases, con errores tipados que el backend traduce a HTTP status correctos y el frontend generalmente muestra en un banner de error visible. Varios bugs de UX ya fueron encontrados y corregidos por el equipo en sesiones recientes (24/08 y 18/08/2026, ver `docs/punto-de-partida-session de cierre-2026-08-24.md`), y esas correcciones están presentes y verificadas en el código actual (cadena que no refrescaba, reemplazante viejo mostrado indefinidamente).

Sin embargo, esta auditoría encontró **3 hallazgos P0**: dos flujos donde el sistema completa una acción parcialmente y no informa al usuario que parte de lo que pidió no se ejecutó (creación de reemplazos en el paso 4 del wizard "Nueva incidencia", y reasignación de clases en "Ausencia del suplente"), y un tercero donde la pantalla de edición promete una capacidad ("solo podés modificar la fecha de cierre") que **nunca se activa** por un campo mal mapeado entre el include de Prisma y el hook que lo consume — y que, si se fuerza por URL directa, el backend rechaza igual con un mensaje que no coincide con lo que la UI mostró.

También hay una brecha de consistencia notable entre la pantalla de detalle (que bloquea proactivamente acciones inválidas con tooltips) y la de listado (que permite iniciar las mismas acciones sin esa protección, y sin esperar la respuesta del servidor antes de cerrar el modal de confirmación).

No se detectaron problemas de arquitectura (no hay reglas de negocio en componentes UI ni en las rutas API; la cadena API → UseCase → Repository → Prisma se respeta).

## 2. Rama y commit auditado

- Rama: `refactor-clases-programadas-frontend`
- Commit: `8fb79a2622f0d18608c58b98d020cb84293bccb3`
- **Acceso a navegador/dev server: NO.** No hay herramienta de navegador/Playwright disponible en este entorno, y no había un dev server corriendo (`curl localhost:3000` → sin respuesta). Toda la auditoría se hizo por **lectura de código** (frontend, hooks, servicios, rutas API, use cases, repositorio, schema, tests). Cada hallazgo está marcado `Fuente: código (inferido)`. Ningún hallazgo fue verificado interactuando con la UI real.

## 3. Alcance auditado (rutas confirmadas en el repo)

Pantallas bajo `app/protected/dashboard/incidencias/`:

| Ruta | Archivo |
|---|---|
| `/protected/dashboard/incidencias` | `page.tsx` (listado) |
| `/protected/dashboard/incidencias/nueva` | `nueva/page.tsx` (wizard de 4/5 pasos) |
| `/protected/dashboard/incidencias/[id]` | `[id]/page.tsx` (detalle) |
| `/protected/dashboard/incidencias/editar/[id]` | `editar/[id]/page.tsx` (edición) |

API bajo `app/api/incidencias/`:

- `GET /api/incidencias`, `POST /api/incidencias`
- `GET|PATCH|DELETE /api/incidencias/[id]`
- `POST /api/incidencias/[id]/reactivar`
- `GET /api/incidencias/[id]/cadena`
- `GET /api/incidencias/[id]/cobertura`
- `GET /api/incidencias/[id]/clases`
- `GET /api/incidencias/asignacion/[id]`
- `POST /api/incidencias/validar-superposicion` (no consumido por ningún componente de frontend actual — solo tiene tests directos de API)

Use cases: `crearIncidencia`, `actualizarIncidencia`, `eliminarIncidencia`, `reactivarIncidencia`, `listarIncidencias`, `obtenerIncidencia`, `obtenerCadena`, `obtenerCoberturaPorTramos`, `resolverClasesIncidencia`. Repositorio: `incidenciaRepository.ts`.

No se auditó en profundidad: validación de auto-reemplazo, ni el detalle interno de "crear reemplazo" como flujo propio (cubierto por el módulo Reemplazos) — sí se auditan, dentro de Incidencias, los puntos donde la pantalla de incidencia dispara esas acciones (agregar/quitar reemplazo desde "Clases afectadas", "Ausencia del suplente").

## 4. Inventario de pantallas

### 4.1 Listado — `/incidencias`
- **Objetivo:** ver todas las incidencias activas (o eliminadas), filtrar, entrar al detalle, eliminar/reactivar rápido.
- **Rol esperado:** cualquier usuario con acceso al módulo (no hay diferenciación de permisos visible en el código de esta pantalla).
- **Acciones:** buscar por texto, alternar "Ver eliminadas", ir a "Nueva incidencia", "Gestionar" (ir al detalle), "Eliminar", "Reactivar". Soporta querystring `?hoy=1` y `?vence=hoy|manana|resto-semana|7dias` (deep-link desde el dashboard).
- **Tabla:** Agente, Asignación, Tipo, Desde, Hasta, Cadena (Sí/No), acciones.
- **Modal:** confirmación de eliminación (`ModalConfirmar`).
- **Mensajes:** banner de error superior; contador de resultados con leyenda dinámica según filtro activo.

### 4.2 Detalle — `/incidencias/[id]`
- **Objetivo:** ver todos los datos de una incidencia, su cadena, cobertura, clases afectadas, y operar sobre ella (editar, eliminar, reactivar, gestionar reemplazos, registrar ausencia del suplente).
- **Acciones:** Editar (condicionada), Eliminar (condicionada), Reactivar (si está eliminada), "Ausencia del suplente" (si hay reemplazo activo), Agregar/Quitar reemplazo por clase, navegar a incidencia padre/hijas, navegar a cualquier eslabón de la cadena.
- **Tablas:** "Clases afectadas" (colapsable), "Cadena de incidencias".
- **Modales:** confirmar eliminar, confirmar reactivar, agregar reemplazo (`ModalReemplazo`), registrar ausencia del suplente (`ModalAusenciaSuplente`, crea una incidencia hija y reasigna clases).
- **Bloqueos proactivos:** botones Editar/Eliminar deshabilitados con `title` explicativo si `tieneHijos` o `tieneReemplazos` (activos).

### 4.3 Nueva incidencia — `/incidencias/nueva` (wizard, 5 pasos: Seleccionar → Revisar lote → Incidencia → Reemplazos → Resultado)
- **Objetivo:** cargar la misma incidencia (tipo, fechas, observación) a múltiples asignaciones a la vez, y opcionalmente asignar reemplazos a las clases que quedaron suspendidas.
- **Paso 1 (`PasoSeleccion`):** filtrar/seleccionar asignaciones (checkbox por fila, "seleccionar todos" respeta el filtro activo).
- **Paso 2 (`PasoRevision`):** revisar el lote, quitar asignaciones antes de continuar.
- **Paso 3 (`PasoFormulario`):** tipo (codigario + item), fecha desde/hasta, observación opcional. Al guardar, crea una incidencia por cada asignación del lote (secuencial, con resultado por fila).
- **Paso 4 (`PasoReemplazos`):** por cada incidencia creada, lista sus clases suspendidas agrupadas por asignación; selección de clases + suplente por clase o "aplicar a todas"; permite saltear el paso.
- **Resultado (`ResultadoCarga`):** tabla con OK/error por asignación, botón "Ir a incidencias" y, si hubo fallidas, "Reintentar fallidas".

### 4.4 Editar — `/incidencias/editar/[id]`
- **Objetivo:** modificar tipo, fechas u observación de una incidencia existente. Si la incidencia "tiene reemplazo", según el diseño de esta pantalla solo debería poder modificarse la fecha de cierre.
- **Formulario:** codigario, item, fecha desde, fecha hasta, observación. Guardar → vuelve al detalle.

## 5. Matriz de acciones críticas

| Pantalla | Acción | API / UseCase | Resultado esperado |
|---|---|---|---|
| Listado | Eliminar | `DELETE /api/incidencias/[id]` → `eliminarIncidencia` | Soft-delete si no tiene hijos ni reemplazos activos; libera y re-resuelve las clases vinculadas |
| Listado | Reactivar | `POST /api/incidencias/[id]/reactivar` → `reactivarIncidencia` | Reactiva si el período no pasó y no hay superposición con otra incidencia activa; re-vincula y re-resuelve clases |
| Detalle | Eliminar | ídem listado | ídem, con bloqueo proactivo en UI si corresponde |
| Detalle | Reactivar | ídem listado | ídem, con confirmación modal |
| Detalle | Editar (navegar) | — | Bloqueado en UI si `tieneHijos` o `tieneReemplazos` (activos) |
| Detalle | Agregar reemplazo a una clase | `POST /api/reemplazos` (vía `crearReemplazoService`) | Clase pasa a REEMPLAZADA; refresca clases + cadena |
| Detalle | Quitar reemplazo de una clase | `DELETE /api/reemplazos/[id]` | Clase vuelve a SUSPENDIDA; refresca clases + cadena |
| Detalle | Ausencia del suplente | `POST /api/incidencias` (con `incidenciaPadreId`) + N × `POST /api/reemplazos/reasignar` | Crea incidencia hija acotada al rango del padre; reasigna clases PROGRAMADA/REEMPLAZADA al nuevo suplente |
| Nueva — Paso 3 | Crear lote | N × `POST /api/incidencias` → `crearIncidencia` | Una incidencia por asignación; valida clases en rango, superposición, rango dentro del padre |
| Nueva — Paso 4 | Confirmar reemplazos | N × `POST /api/reemplazos` | Reemplazo por cada clase seleccionada con suplente asignado |
| Editar | Guardar | `PATCH /api/incidencias/[id]` → `actualizarIncidencia` | Actualiza campos; si cambia el rango, desvincula y re-resuelve clases fuera del nuevo rango |

## 6. Hallazgos

### P0 — Crítico

#### UX-INC-001 — La restricción "solo fecha de cierre editable" nunca se activa, y si se fuerza por URL el backend igual rechaza con un mensaje distinto
**Prioridad:** P0  **Tipo:** VALIDACIÓN DE NEGOCIO / FORMULARIO
**Fuente:** código (inferido)
**Pantalla:** Editar incidencia (`/incidencias/editar/[id]`)
**Acción:** Editar una incidencia que tiene un reemplazo asociado
**Resultado esperado:** Según el propio texto de la pantalla ("Esta incidencia tiene un reemplazo asociado. Solo podés modificar la fecha de cierre"), el formulario debería bloquear todos los campos salvo `fecha_hasta`, y el guardado debería aceptarse.
**Resultado actual:** El indicador `tieneReemplazo` que decide este modo se calcula en `useEditarIncidencia.ts:43-48` leyendo `r1.ClaseProgramada` de la respuesta de `GET /api/incidencias/[id]`. Pero el `incidenciaInclude` en `lib/repositories/incidenciaRepository.ts:4-50` **no incluye `ClaseProgramada` a nivel de la incidencia consultada** — solo lo incluye anidado dentro de `padre.ClaseProgramada` (línea 20, comentario "NUEVO: para mostrar quién era el suplente (B) en la incidencia padre"). Por lo tanto `r1.ClaseProgramada` es siempre `undefined`, `Array.isArray(undefined)` es `false`, y `tieneReemplazo` es **siempre `false`**, sin importar si la incidencia tiene reemplazos o no.
Consecuencia doble:
1. El modo restringido nunca se muestra, ni siquiera para incidencias con reemplazos ya removidos (caso en el que el negocio sí querría permitir edición completa, pero por accidente, no por diseño).
2. Si un usuario llega a `/incidencias/editar/[id]` de una incidencia con un **reemplazo activo** (posible solo navegando la URL directamente, ya que el botón "Editar" del detalle está deshabilitado en ese caso — `app/protected/dashboard/incidencias/[id]/page.tsx:173-180`), ve el formulario **completo y editable**, sin ningún aviso. Al guardar, `actualizarIncidencia.ts:54-64` (Regla 2) rechaza **cualquier** cambio con `TieneReemplazosError` (409) — "No se puede editar una incidencia que tiene reemplazos asignados en sus clases" — un mensaje que contradice lo que el usuario acaba de ver e intentar.
**Evidencia:**
- `lib/repositories/incidenciaRepository.ts:4-50` (incidenciaInclude sin `ClaseProgramada` top-level)
- `features/incidencias/hooks/useEditarIncidencia.ts:43-48`
- `features/incidencias/components/EditarIncidenciaForm.tsx` (renderiza inputs deshabilitados solo si `tieneReemplazo`, que nunca es `true`)
- `lib/usecases/incidencias/actualizarIncidencia.ts:54-64` (Regla 2, bloqueo incondicional)
**Impacto para el usuario:** Pérdida de datos cargados (el usuario completa el formulario entero y lo pierde al fallar), mensaje de error que no coincide con lo mostrado previamente, y una funcionalidad de negocio documentada en el propio texto de la UI que no existe en la práctica.
**Recomendación:** Incluir `ClaseProgramada` (o un campo derivado, ej. `tieneReemplazoActivo`) en la respuesta de `GET /api/incidencias/[id]`, alinear el criterio (activo vs. histórico) con el que ya usa el detalle (`clases.some(c => c.reemplazos.some(r => r.activo))`), y decidir explícitamente si el modo restringido debe basarse en reemplazos activos o históricos. No implementar sin autorización, dado que toca el use case y el repositorio (áreas de negocio).

---

#### UX-INC-002 — Fallos al crear reemplazos en el paso 4 del wizard no se muestran al usuario
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE / ERROR NO INFORMADO
**Fuente:** código (inferido)
**Pantalla:** Nueva incidencia — Paso 4 (Reemplazos)
**Acción:** "Confirmar N reemplazos" tras seleccionar clases y asignar suplentes
**Resultado esperado:** Si algún `POST /api/reemplazos` falla (agente inválido, superposición, error de red, etc.), el usuario debería enterarse de cuáles clases quedaron sin reemplazo y por qué.
**Resultado actual:** `guardarReemplazos()` en `features/incidencias/hooks/useNuevaIncidencia.ts:373-404` dispara todos los `POST /api/reemplazos` en paralelo con `Promise.all`, cada promesa ya atrapa su propio error y lo convierte en `{ claseId, ok: false, error }` — pero **ese array de resultados nunca se usa**: no se guarda en estado, no se combina con `resultado`, no se muestra en ningún lado. La función simplemente hace `setPaso(5)` al terminar, sin mirar si algo falló. La pantalla de resultado (`ResultadoCarga.tsx`) solo conoce el `resultado` de la creación de **incidencias** (paso 3); no tiene ninguna noción de si los reemplazos del paso 4 se crearon o no.
**Evidencia:** `features/incidencias/hooks/useNuevaIncidencia.ts:373-404` (variable `promesas`/resultado del `Promise.all` descartada); `features/incidencias/components/ResultadoCarga.tsx` (no recibe ni muestra datos de reemplazos).
**Impacto para el usuario:** El usuario completa el wizard, ve "3 creada(s) correctamente" y cree que las clases ya tienen suplente asignado, cuando puede que ninguna se haya cubierto. Se entera recién si vuelve manualmente al detalle de cada incidencia a revisar "Clases afectadas" — no hay ningún indicio en el flujo mismo.
**Recomendación:** Capturar los resultados de cada `POST /api/reemplazos`, agregarlos al estado `resultado` (o a un estado paralelo), y mostrar en `ResultadoCarga` cuántos reemplazos se crearon vs. fallaron, con detalle por clase.

---

#### UX-INC-003 — "Ausencia del suplente" puede fallar en reasignar clases sin que el usuario se entere
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE / ERROR NO INFORMADO
**Fuente:** código (inferido)
**Pantalla:** Detalle de incidencia → modal "Registrar ausencia del suplente"
**Acción:** Confirmar el registro de la ausencia con un nuevo suplente seleccionado
**Resultado esperado:** Si se elige un nuevo suplente, todas las clases elegibles (PROGRAMADA o REEMPLAZADA) deberían reasignarse a la nueva incidencia y al nuevo suplente; si alguna reasignación falla, el usuario debería saberlo antes de continuar.
**Resultado actual:** `ModalAusenciaSuplente.tsx:109-133` usa `Promise.allSettled` sobre las reasignaciones (`reasignarReemplazoService`) y **no inspecciona los resultados** (ni cuenta rechazos, ni loguea cuáles clases fallaron). Independientemente de cuántas reasignaciones hayan fallado, el código sigue a `onCreada(nueva.id)`, que cierra el modal y navega al detalle de la incidencia recién creada como si todo hubiera salido bien.
**Evidencia:** `features/incidencias/components/ModalAusenciaSuplente.tsx:121-133`
**Impacto para el usuario:** El usuario cree haber resuelto la ausencia del suplente para todas las clases afectadas, pero algunas pueden haber quedado sin reasignar (con el reemplazo viejo activo o sin cobertura), y solo lo notará si revisa manualmente "Clases afectadas" de la nueva incidencia.
**Recomendación:** Verificar el resultado de cada `allSettled`, y si hay rechazos, mostrar un aviso (no bloqueante, ya que la incidencia sí se creó) listando qué clases no se pudieron reasignar y por qué, antes de o al momento de navegar.

---

### P1 — Importante

#### UX-INC-004 — "Reintentar fallidas" reintenta todo el lote, no solo lo que falló
**Prioridad:** P1  **Tipo:** NAVEGACIÓN / FORMULARIO
**Fuente:** código (inferido)
**Pantalla:** Nueva incidencia — Resultado (`ResultadoCarga`)
**Acción:** Click en "Reintentar fallidas" tras una carga parcialmente exitosa
**Resultado esperado:** Volver al paso 3 con solo las asignaciones que fallaron, para corregir y reintentar sin duplicar lo que ya se creó.
**Resultado actual:** El botón llama a `onReintentar={() => { setResultado(null); setPaso(3) }}` (`app/protected/dashboard/incidencias/nueva/page.tsx:109-112`). Esto no filtra `seleccionados`/`asignacionesLote`: el paso 3 vuelve a mostrarse con el **lote original completo**, incluidas las asignaciones cuya incidencia ya se creó con éxito. Si el usuario reintenta directamente, `crearIncidencia` fallará de nuevo para esas asignaciones (por `SuperposicionError`, ya que la incidencia recién creada se superpone consigo misma), mostrando errores confusos para operaciones que en realidad ya habían tenido éxito.
**Evidencia:** `app/protected/dashboard/incidencias/nueva/page.tsx:109-114`; `features/incidencias/hooks/useNuevaIncidencia.ts:166-169` (`asignacionesLote` deriva de `seleccionados`, que no se modifica tras el resultado)
**Impacto para el usuario:** Confusión ("¿por qué me dice error si ya lo había creado bien?"), riesgo de que el usuario interprete el nuevo error como que la incidencia original no se creó y tome una acción incorrecta.
**Recomendación:** Al reintentar, recalcular `seleccionados`/el lote a partir de las filas con `ok: false` del `resultado`, no del estado de selección original.

---

#### UX-INC-005 — El mensaje de confirmación de "Eliminar" dice que la acción es irreversible, pero existe "Reactivar"
**Prioridad:** P1  **Tipo:** MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Listado y Detalle de incidencia
**Acción:** Eliminar una incidencia
**Resultado esperado:** El texto de confirmación debería reflejar el comportamiento real del sistema (soft-delete reversible vía "Reactivar"), o explicar bajo qué condiciones ya no se puede reactivar (período vencido, superposición).
**Resultado actual:** Ambas pantallas usan el mismo texto fijo: "¿Eliminar esta incidencia? Esta acción no se puede deshacer." (`app/protected/dashboard/incidencias/page.tsx:48`, `app/protected/dashboard/incidencias/[id]/page.tsx:72`). Sin embargo, `eliminarIncidencia` hace un soft-delete (`activo: false, deletedAt: <fecha>`), y ambas pantallas exponen explícitamente un botón "Reactivar" para incidencias eliminadas. La reactivación puede fallar si el período ya venció (`FechaPasadaError`) o si hay superposición con otra incidencia activa creada mientras tanto (`SuperposicionError`), pero eso no es "nunca se puede deshacer": en el caso general, sí se puede.
**Evidencia:** `features/incidencias/components/ModalConfirmar.tsx` (mensaje fijo pasado por el padre); `lib/repositories/incidenciaRepository.ts:309-332` (`eliminar` = soft-delete); `lib/usecases/incidencias/reactivarIncidencia.ts`
**Impacto para el usuario:** Genera una alarma más fuerte de la necesaria (puede desalentar una eliminación legítima y reversible), o, si el usuario aprende que sí es reversible, hace que deje de confiar en los avisos de "no se puede deshacer" del resto del sistema.
**Recomendación:** Cambiar el texto a algo como "¿Eliminar esta incidencia? Vas a poder reactivarla después, salvo que el período ya haya vencido o surja un conflicto de fechas."

---

#### UX-INC-008 — Si falla la carga de clases de una de las incidencias del lote, esa asignación desaparece del paso 4 sin aviso
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO
**Fuente:** código (inferido)
**Pantalla:** Nueva incidencia — Paso 4 (Reemplazos)
**Acción:** Transición automática del paso 3 al paso 4 tras crear el lote
**Resultado esperado:** Si no se pueden traer las clases de alguna incidencia recién creada, el usuario debería saber que ese grupo no está representado en el paso 4 y por qué.
**Resultado actual:** En `guardarLoteYContinuar()` (`useNuevaIncidencia.ts:247-264`), el fetch de `/api/incidencias/${incidenciaId}/clases` por cada incidencia creada usa `if (!res.ok) continue` — si falla para una incidencia puntual, esa asignación simplemente no aporta clases a `clasesAgrupadasPorAsignacion`, sin ningún error visible. El usuario ve un paso 4 con menos grupos de los esperados y no tiene forma de saber si es porque esa asignación no tenía clases en el rango (caso normal) o porque falló la carga (caso de error).
**Evidencia:** `features/incidencias/hooks/useNuevaIncidencia.ts:252-264`
**Impacto para el usuario:** Una asignación puede quedar sin reemplazo asignado en el wizard sin que el usuario sepa que se le "perdió" un paso, y sin ningún mensaje que lo justifique.
**Recomendación:** Registrar qué incidencias fallaron al traer sus clases y mostrar un aviso puntual en el paso 4 (ej. "No se pudieron cargar las clases de N asignación(es); podés agregarles reemplazo después desde el detalle").

---

#### UX-INC-012 — En el listado, Eliminar y Reactivar no esperan la respuesta del servidor antes de cerrar/continuar
**Prioridad:** P1  **Tipo:** ESTADO / FEEDBACK AUSENTE
**Fuente:** código (inferido)
**Pantalla:** Listado de incidencias
**Acción:** Confirmar "Eliminar" en el modal, o click en "Reactivar" en la fila
**Resultado esperado:** El usuario debería tener alguna señal de que la operación está en curso, y el modal/fila debería reflejar el resultado real antes de considerarse "terminado".
**Resultado actual:** `app/protected/dashboard/incidencias/page.tsx:49` — `onConfirmar={() => { eliminar(confirmarId); setConfirmarId(null) }}`: el modal se cierra inmediatamente, sin esperar a que `eliminar()` (async) resuelva. Si la eliminación fallla (ej. `TieneHijosError` 409), el modal ya se cerró y el único indicio es un banner de error que aparece con un instante de desfase, sin relación visual con la fila afectada. Lo mismo para "Reactivar": `onReactivar={reactivar}` en `IncidenciasTable.tsx:156` dispara la promesa sin loading state por fila ni deshabilitar el botón mientras está en curso — nada impide un doble click, y no hay indicio visual de "reactivando...".
Compárese con el Detalle, donde `onConfirmar={async () => { const ok = await eliminar(); if (ok) router.push(...) }}` sí espera el resultado antes de navegar (`app/protected/dashboard/incidencias/[id]/page.tsx:73-77`).
**Evidencia:** `app/protected/dashboard/incidencias/page.tsx:46-51`; `features/incidencias/components/IncidenciasTable.tsx:147-161`
**Impacto para el usuario:** En el caso de error, el usuario no tiene indicio claro de qué pasó ni con cuál fila, más allá de un banner genérico arriba de toda la tabla. En listados largos esto obliga a "adivinar" cuál fila fue.
**Recomendación:** Esperar el resultado antes de cerrar el modal (o mostrar loading dentro del modal), y agregar estado de carga por fila para Reactivar.

---

### P2 — Moderado

#### UX-INC-006 — El listado permite intentar "Eliminar" una incidencia con cadena, aunque esa información ya está disponible
**Prioridad:** P2  **Tipo:** VALIDACIÓN UX / CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Listado de incidencias
**Acción:** Click en "Eliminar" sobre una incidencia que tiene hijos en la cadena
**Resultado esperado:** Igual que en el Detalle (que deshabilita el botón con tooltip cuando `tieneHijos`), el listado podría evitar el intento cuando ya sabe que va a fallar.
**Resultado actual:** `IncidenciasTable.tsx` calcula y muestra la columna "Cadena" (`i.padre || (i.hijos?.length ?? 0) > 0`, línea ~131) — es decir, el dato de si tiene hijos **ya está disponible** en esa misma fila — pero el botón "Eliminar" (línea ~148) está siempre habilitado, sin usar ese dato para deshabilitarlo. El usuario confirma en el modal ("no se puede deshacer", ver UX-INC-005) y recién ahí el backend devuelve 409 `TieneHijosError`.
**Evidencia:** `features/incidencias/components/IncidenciasTable.tsx:130-153`; comparar con `app/protected/dashboard/incidencias/[id]/page.tsx:173-188` (Detalle sí deshabilita proactivamente)
**Impacto para el usuario:** Fricción evitable — confirmar una acción destructiva para enterarse después de que estaba bloqueada de antemano. No hay pérdida de datos (la incidencia no se borra), pero rompe la expectativa de que un botón habilitado es una acción posible.
**Recomendación:** Deshabilitar "Eliminar" en el listado cuando `(i.hijos?.length ?? 0) > 0`, con el mismo criterio que el detalle. (Nota: el listado no trae información de reemplazos activos por fila, así que ese bloqueo específico no se puede replicar sin cambiar la consulta — documentar como limitación si no se amplía el alcance.)

---

#### UX-INC-007 — Reactivar en el listado no pide confirmación; en el Detalle sí
**Prioridad:** P2  **Tipo:** CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** Listado vs. Detalle de incidencia
**Acción:** Reactivar una incidencia eliminada
**Resultado esperado:** Mismo nivel de fricción/confirmación para la misma acción, sin importar desde qué pantalla se dispare.
**Resultado actual:** En el listado, el botón "Reactivar" de `IncidenciasTable.tsx:154-160` llama a `onReactivar(i.id)` directamente, sin modal de confirmación. En el Detalle, la misma acción pasa por `ModalConfirmar` con mensaje "¿Reactivar esta incidencia?" (`app/protected/dashboard/incidencias/[id]/page.tsx:81-88`). Reactivar no es puramente inocuo: puede reintroducir una incidencia que ahora se superpone con otra creada en el ínterin (y fallar), o revertir el estado de clases que ya fueron reprogramadas de otra forma.
**Evidencia:** `features/incidencias/components/IncidenciasTable.tsx:154-161` vs. `app/protected/dashboard/incidencias/[id]/page.tsx:81-88`
**Impacto para el usuario:** Un click accidental en el listado reactiva sin margen para arrepentirse, mientras la misma acción en el detalle sí lo da. Inconsistencia de patrón dentro del mismo módulo.
**Recomendación:** Unificar: agregar confirmación en el listado, o quitarla del detalle si se decide que Reactivar no la necesita (manteniendo el mismo criterio en ambos lados).

---

#### UX-INC-009 — El único punto de entrada para crear una incidencia encadenada (hija) es "Ausencia del suplente"
**Prioridad:** P2  **Tipo:** NAVEGACIÓN / FORMULARIO
**Fuente:** código (inferido)
**Pantalla:** Todo el módulo
**Acción:** Crear una incidencia hija de otra existente (corrección de una incidencia, según `docs/cadena_reemplazos_incidencias.md`: "Si una incidencia necesita corrección → se crea una nueva [hija]")
**Resultado esperado:** El modelo de datos y la documentación de negocio contemplan cadenas de incidencias en general, no solo para el caso "el suplente también se ausenta".
**Resultado actual:** En todo `features/incidencias`, el único lugar donde se envía `incidenciaPadreId` al crear una incidencia es `ModalAusenciaSuplente.tsx` (confirmado por búsqueda en el código: es la única referencia de `incidenciaPadreId` fuera de tipos/servicio). Ese modal solo aparece cuando la incidencia actual tiene un reemplazo activo (`reemplazoActivoIncidencia`, `[id]/page.tsx:160-172`). No existe una vía en la UI para crear una incidencia hija de corrección sobre una incidencia del **titular** que no tenga reemplazo asignado — solo se puede lograr llamando a la API directamente.
**Evidencia:** búsqueda de `incidenciaPadreId` en `features/incidencias/**` (única aparición fuera de tipos: `ModalAusenciaSuplente.tsx`); `app/protected/dashboard/incidencias/[id]/page.tsx:160-172`
**Impacto para el usuario:** Si el negocio espera que un operador pueda "corregir" cualquier incidencia creando una hija (no solo en el escenario de ausencia del suplente), esa capacidad no es alcanzable desde la interfaz.
**Recomendación:** Confirmar con negocio si "corrección vía hija" fuera del escenario de suplente es un caso real a soportar; si lo es, exponer un punto de entrada equivalente. RIESGO / NO CONFIRMADO: no se pudo verificar contra el usuario de negocio si este es un gap real o un alcance intencional.

---

### P3 — Menor

#### UX-INC-010 — El endpoint de validación anticipada de superposición existe pero no se usa
**Prioridad:** P3  **Tipo:** VALIDACIÓN UX
**Fuente:** código (inferido)
**Pantalla:** Nueva incidencia (paso 3) y Editar incidencia
**Acción:** Completar fechas antes de guardar
**Resultado esperado / actual:** `POST /api/incidencias/validar-superposicion` está implementado y testeado (`tests/incidencias.test.ts:397+`), pero ningún componente de `features/incidencias` lo invoca. El usuario solo se entera de una superposición al intentar guardar (respuesta 409, mostrada correctamente como error), no mientras completa el formulario.
**Evidencia:** búsqueda de `validar-superposicion` en el repo — solo aparece en la ruta API y en tests.
**Impacto para el usuario:** Bajo — el error sí se muestra al guardar, con el conflicto (`conflicto.id`, fechas). Es una oportunidad de mejora de fricción, no una falla.
**Recomendación:** Si se justifica el esfuerzo, llamar a este endpoint on-blur de las fechas para dar aviso temprano.

---

#### UX-INC-011 — El mensaje "Las incidencias fueron creadas correctamente" en el paso 4 vacío no distingue éxito parcial
**Prioridad:** P3  **Tipo:** MENSAJE
**Fuente:** código (inferido)
**Pantalla:** Nueva incidencia — Paso 4, caso sin clases en rango
**Acción:** Ninguna de las incidencias creadas tiene clases programadas en su rango
**Resultado esperado / actual:** `PasoReemplazos.tsx:313-329` muestra "No se encontraron clases programadas en este rango de fechas. Las incidencias fueron creadas correctamente." — pero esta pantalla solo se alcanza si `creadas.length > 0` (al menos una incidencia se creó); no distingue si **todas** las del lote se crearon o si algunas fallaron (esos resultados ya están en `resultado`, pero el mensaje no los consulta).
**Evidencia:** `features/incidencias/components/PasoReemplazos.tsx:313-329`
**Impacto para el usuario:** Bajo — el detalle correcto se ve igual en el paso 5 (resultado), pero el mensaje intermedio puede sonar más optimista de lo que corresponde si hubo fallas parciales.
**Recomendación:** Condicionar el texto a si `resultado` tiene algún `ok: false`.

---

## 7. Pantallas/zonas auditadas sin problemas relevantes

- **Filtros del listado** (`IncidenciaFilters.tsx`): búsqueda de texto + checkbox "Ver eliminadas", claro y directo.
- **Paso 1 y 2 del wizard** (`PasoSeleccion`, `PasoRevision`): selección con checkboxes, "seleccionar todos" respeta el filtro visible, footer con botón deshabilitado si no hay selección, opción de "Quitar" en la revisión. Buen manejo de estado vacío ("Sin resultados").
- **`IncidenciaDetalleHeader`**: buen trabajo mostrando contexto de negocio no trivial (si la incidencia es de un reemplazante, quién era el titular original, cobertura por tramos) con texto en lenguaje natural en vez de solo IDs.
- **`ModalReemplazo`**: formulario simple, error visible dentro del modal, estado de guardado (`guardando`) deshabilita el botón de confirmar y evita doble envío.
- **Cadena de incidencias y reemplazante mostrado en "Clases afectadas"**: bugs de datos obsoletos (reemplazante viejo, cadena no refrescada) que existían hasta el 24/08/2026 están corregidos en el código actual — verificado leyendo `obtenerCadena.ts` y `useIncidenciaDetalle.ts` (el `recargar` se pasa correctamente a `useClasesAfectadas`).
- **Mapeo de errores de negocio a HTTP status** en las rutas API (`app/api/incidencias/**/route.ts`): consistente — 400 para datos/validación, 404 para no encontrado, 409 para conflictos de negocio (superposición, hijos, reemplazos). El frontend interpreta el body `{ error }` correctamente en todos los `fetch` de `incidenciasService.ts`.
- **Validaciones de formulario de "Nueva incidencia" (paso 3)**: campos obligatorios claramente marcados con `*`, errores por campo, no se pierde lo ya tipeado al fallar una validación de frontend.

## 8. Áreas que no pudieron verificarse

- **Todo el módulo en vivo**: sin navegador ni dev server disponibles, ningún hallazgo fue confirmado interactuando con la UI real; todos están marcados "código (inferido)" y deberían confirmarse con una pasada manual antes de priorizar trabajo, en particular UX-INC-001 (el más disruptivo si se confirma).
- **Permisos por rol**: no se encontró lógica de permisos/roles específica del módulo Incidencias en el código revisado (más allá de autenticación genérica vía `withContext`/`useAuth`); no se pudo determinar si distintos roles ven acciones distintas.
- **Comportamiento bajo carga concurrente** (dos usuarios editando/eliminando la misma incidencia a la vez): el backend tiene checks de existencia antes de escribir, pero no se auditó a fondo condiciones de carrera entre `verificarSuperposicion` y el `create`/`update` subsiguiente (ventana entre lectura y escritura, sin transacción explícita visible en `crearIncidencia`/`actualizarIncidencia`). RIESGO / NO CONFIRMADO.
- **Volumen/paginación del listado**: `listarIncidencias` no pagina; no se evaluó el impacto en UX con un volumen grande de incidencias (fuera del eje funcional/operativo pedido, pero se anota).
- **Datos de prueba**: no se generaron datos de prueba en un tenant existente (ej. Escuela Primaria N°12) porque no hubo acceso a navegador/dev server para ejecutar los flujos; todos los hallazgos parten de lectura estática de código y tests existentes, no de ejecución.

## 9. Lista priorizada de correcciones (no implementadas)

1. **UX-INC-001** — Corregir el include de Prisma / el hook de edición para que `tieneReemplazo` refleje la realidad, y decidir el criterio (activo vs. histórico) de forma consistente con el detalle y el use case.
2. **UX-INC-002** — Mostrar en el resultado del wizard los fallos de creación de reemplazos del paso 4, no solo los de creación de incidencias.
3. **UX-INC-003** — Verificar y mostrar los resultados de `Promise.allSettled` en "Ausencia del suplente".
4. **UX-INC-004** — Que "Reintentar fallidas" solo reintente las filas que fallaron.
5. **UX-INC-012** — Esperar la respuesta del servidor antes de cerrar el modal de eliminar en el listado; agregar loading state a "Reactivar" por fila.
6. **UX-INC-005** — Ajustar el texto de confirmación de "Eliminar" para no afirmar irreversibilidad que no es tal.
7. **UX-INC-008** — Avisar si falló la carga de clases de alguna incidencia del lote en el paso 4.
8. **UX-INC-006** — Deshabilitar "Eliminar" en el listado cuando la incidencia ya tiene hijos visibles en esa misma fila.
9. **UX-INC-007** — Unificar confirmación de "Reactivar" entre listado y detalle.
10. **UX-INC-009** — Resolver con negocio si falta un punto de entrada para crear incidencias hijas de corrección fuera del escenario de suplente.
11. **UX-INC-010** — (opcional) usar `validar-superposicion` para feedback anticipado en los formularios.
12. **UX-INC-011** — Ajustar el mensaje de paso 4 vacío para reflejar éxito parcial.
