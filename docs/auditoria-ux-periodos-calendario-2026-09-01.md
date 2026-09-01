# Auditoría UX funcional y operativa — Períodos Operativos y Calendario Escolar

Fase 5/10 de la auditoría UX por módulos de ALNEXT.

## 1. Resumen ejecutivo

El módulo cubre dos pantallas (`/periodos-operativos` y `/calendario`) que gestionan el ciclo de vida de `PeriodoOperativo` (BORRADOR → ACTIVO → CERRADO, + soft-delete) y de `CalendarioEscolar` (feriados/eventos que suspenden clases). Es un módulo pequeño en superficie (2 pantallas, ~10 acciones) pero de altísimo impacto: todo el motor de resolución de `ClaseProgramada` (`resolucionClaseService.ts`) depende de que haya un período ACTIVO vigente, y cerrar uno dispara efectos irreversibles sobre clases en toda la institución.

El hallazgo más severo no está en las pantallas sino en lo que no hay: el sistema **cierra períodos automáticamente y en silencio** (gate diario en `withContext.ts`, feature #81 del 24/08/2026) reutilizando exactamente el mismo `cerrarPeriodo()` que la acción manual — pero sin que exista ningún punto de la UI, ni siquiera un log visible, que informe que eso pasó y qué clases quedaron afectadas. El cierre manual tiene el problema simétrico pero menos grave: sí hay un modal de confirmación, pero su texto describe mal la consecuencia real para cierres anticipados, y los contadores que el propio backend calcula (`clasesMarcadasDictadas`, `clasesSuspendidasPorPeriodo`) se descartan antes de llegar a la pantalla.

En Calendario Escolar el patrón se repite: marcar/desmarcar "Suspende clases" en un feriado re-resuelve clases de toda la institución para esa fecha (`resolverClasesPorCalendario`, que hasta devuelve un contador `actualizadas`), pero ese número nunca llega al usuario en ningún flujo (crear, editar, eliminar, reactivar).

Se detectaron 13 hallazgos: 4 P0, 5 P1, 3 P2, 1 P3. Ninguno fue implementado ni corregido — este documento es exclusivamente de auditoría.

## 2. Rama y commit auditado

- Rama: `refactor-clases-programadas-frontend`
- Commit: `83bfcc16dfa58fb989556bf8f8a0b8d24dee0cf9`
- Acceso a navegador: **no hubo**. Se confirmó que el dev server de Next.js está corriendo (`curl localhost:3000` → 200, proceso `next dev` activo en el entorno), pero no hay una herramienta de navegador interactivo disponible en esta sesión, y la app requiere un token de sesión (`sessionStorage`, ver `useAuth.ts`) más headers `x-user-id`/`x-tenant-id` inyectados por un proxy upstream que no se pudo reproducir vía `curl` en el tiempo de esta auditoría. **Todos los hallazgos son "Fuente: código (inferido)"**, no "prueba en vivo". No se generaron datos de prueba porque no hubo forma de operar la UI ni la API autenticada.

## 3. Alcance auditado

Pantallas/rutas confirmadas en el repo (no se asumió ningún nombre):

- `app/protected/dashboard/periodos-operativos/page.tsx` → **Períodos Operativos**
- `app/protected/dashboard/calendario/page.tsx` → **Calendario Escolar** (el comentario de cabecera del archivo dice `calendario-escolar/page.tsx`, que es una ruta que no existe; ver nota en §9)

API:
- `app/api/periodos-operativos/route.ts` (GET, POST)
- `app/api/periodos-operativos/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/periodos-operativos/[id]/activar/route.ts` (POST)
- `app/api/periodos-operativos/[id]/cerrar/route.ts` (POST)
- `app/api/periodos-operativos/[id]/restaurar/route.ts` (POST)
- `app/api/periodos-operativos/activo/route.ts` (GET, no usado por ninguna de las dos pantallas)
- `app/api/calendario-escolar/route.ts` (GET, POST)
- `app/api/calendario-escolar/[id]/route.ts` (PATCH, DELETE)
- `app/api/calendario-escolar/[id]/reactivar/route.ts` (POST)

Modelos confirmados en `prisma/schema.prisma`: `PeriodoOperativo` (enum `EstadoPeriodo`: BORRADOR/ACTIVO/CERRADO) y `CalendarioEscolar` (el nombre real del modelo — no hay un modelo separado "Feriado"; un feriado es una fila de `CalendarioEscolar` con `esFeriado=true`).

Fuera de alcance (mencionado solo donde es imprescindible para entender la causa/efecto): generación y resolución de `ClaseProgramada` en sí (ya cubierto conceptualmente por auditorías previas de Asignaciones/Distribuciones/Incidencias), Dashboard, reportes.

## 4. Inventario de pantallas

### 4.1 Períodos Operativos (`/protected/dashboard/periodos-operativos`)

- **Objetivo:** crear, activar, cerrar, editar, eliminar y restaurar períodos operativos de la institución.
- **Rol esperado:** no hay ninguna verificación de rol visible en el código de la pantalla, el hook `useAuth` ni en `withContext.ts` (ver hallazgo UX-PER-012). Cualquier usuario autenticado de la institución puede ejecutar todas las acciones, incluidas Cerrar y Activar.
- **Acciones disponibles:** Nuevo período, Editar (solo BORRADOR), Activar (solo BORRADOR), Cerrar período (solo ACTIVO), Eliminar (BORRADOR o CERRADO), Restaurar (eliminados), Buscar por nombre, Ver eliminados.
- **Formulario:** nombre, fecha_desde, fecha_hasta (los tres obligatorios; validación de que desde < hasta).
- **Tabla:** Nombre, Vigencia (rango de fechas), Estado, Acciones. Filtro client-side por nombre sobre lo ya cargado.
- **Modales de confirmación:** "Eliminar período" y "Cerrar período" (genérico, `ModalConfirmar`). "Activar" **no tiene modal**.
- **Mensajes:** error global dismisseable (rojo), aviso de activación dismisseable (verde), aviso proactivo "sin período activo" / "vence en N días" (banner sobrio, no dismisseable, se recalcula solo).
- **Navegación posterior:** ninguna — todas las acciones se resuelven in-place recargando la lista.

### 4.2 Calendario Escolar (`/protected/dashboard/calendario`)

- **Objetivo:** cargar/editar/eliminar eventos de calendario (feriados u otros motivos de suspensión) por período operativo.
- **Rol esperado:** igual que arriba, sin verificación visible.
- **Acciones disponibles:** selector de Período (todos, no solo el ACTIVO), Nuevo evento, Editar, Eliminar, Restaurar (eliminados), Buscar por descripción, Ver eliminados. Todas las acciones de escritura se ocultan si el período seleccionado está CERRADO (`soloLectura`).
- **Formulario:** fecha (acotada con `min`/`max` al rango del período seleccionado vía atributos HTML nativos), descripción, checkboxes "Es feriado" y "Suspende clases".
- **Tabla:** Fecha, Descripción, Feriado (Sí/No), Suspende clases (Sí/No), Acciones.
- **Modal de confirmación:** solo "Eliminar evento".
- **Estado vacío:** si la institución no tiene ningún período operativo creado, la pantalla muestra un mensaje dedicado con link directo a Períodos Operativos — buen patrón, sin problemas.
- **Navegación posterior:** ninguna, todo in-place.

## 5. Matriz de acciones críticas

| Pantalla | Acción | API | UseCase | Confirmación previa | Feedback de impacto post-acción |
|---|---|---|---|---|---|
| Períodos Operativos | Crear | POST /periodos-operativos | `crearPeriodo` | No aplica (no destructivo) | Cierra form, recarga lista |
| Períodos Operativos | Editar | PATCH /periodos-operativos/:id | `actualizarPeriodo` | No aplica | Cierra form, recarga lista |
| Períodos Operativos | **Activar** | POST /periodos-operativos/:id/activar | `activarPeriodo` | **No hay modal** | Parcial: muestra clases creadas y distribuciones sin módulos; **ignora la reconciliación de clases fuera de rango** |
| Períodos Operativos | **Cerrar** | POST /periodos-operativos/:id/cerrar | `cerrarPeriodo` | Sí, pero texto impreciso (§ UX-PER-002) | **Ninguno** — el backend calcula contadores y la UI los descarta |
| Períodos Operativos | Eliminar | DELETE /periodos-operativos/:id | `eliminarPeriodo` | Sí, pero texto engañoso ("no se puede deshacer" siendo reversible) | Recarga lista |
| Períodos Operativos | Restaurar | POST /periodos-operativos/:id/restaurar | `restaurarPeriodo` | No | Recarga lista |
| Períodos Operativos | *(automático)* Cierre por vencimiento | — (gate en `withContext.ts`, cualquier request) | `cerrarPeriodo` (reusado) | **No existe ningún punto de UI** | **Ninguno, en absoluto** |
| Calendario Escolar | Crear evento | POST /calendario-escolar | `crearCalendarioEscolar` | No aplica | Ninguno sobre clases afectadas |
| Calendario Escolar | Editar evento | PATCH /calendario-escolar/:id | `actualizarCalendarioEscolar` | No aplica | Ninguno sobre clases afectadas |
| Calendario Escolar | Eliminar evento | DELETE /calendario-escolar/:id | `eliminarCalendarioEscolar` | Sí, texto "no se puede deshacer" (misma inconsistencia) | Ninguno sobre clases afectadas |
| Calendario Escolar | Restaurar evento | POST /calendario-escolar/:id/reactivar | `reactivarCalendarioEscolar` | No | Ninguno sobre clases afectadas |

## 6. Hallazgos

### UX-PER-001 — El cierre automático de un período vencido es completamente silencioso
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE / ACCIÓN DESTRUCTIVA  **Fuente:** código (inferido)
**Pantalla:** ninguna (ocurre por detrás de cualquier request a la API mientras el usuario navega la app)
**Acción:** el gate diario `cerrarPeriodoSiVencido()` en `lib/auth/withContext.ts:36-46` se ejecuta en la primera request del día de cada institución y, si el período ACTIVO ya pasó su `fecha_hasta`, llama a `cerrarPeriodo()` — el mismo usecase que la acción manual "Cerrar período".
**Resultado esperado:** dado que cerrar un período es una acción con consecuencias explícitamente tratadas como críticas en el resto del módulo (tiene su propio modal de confirmación cuando es manual), su ejecución automática debería, como mínimo, quedar visible para el usuario la próxima vez que entra a la app (banner, notificación, o algo en el detalle del período).
**Resultado actual:** no hay ningún registro visible en el frontend. `cerrarPeriodoSiVencido` no devuelve nada al handler que lo invoca (`resolverClasesVencidasSiCorresponde`, línea 62) — se descarta incluso el resultado de `cerrarPeriodo()` (que incluye `clasesMarcadasDictadas`/`clasesSuspendidasPorPeriodo`). Si falla, solo hace `console.error` server-side (línea 43-44). El usuario puede entrar un día cualquiera, ver que su período pasó de ACTIVO a CERRADO, y no tiene forma de saber cuándo pasó ni qué se vio afectado.
**Evidencia:** `lib/auth/withContext.ts:36-46` (`cerrarPeriodoSiVencido`), reusa `lib/usecases/periodosOperativos/cerrarPeriodo.ts`. Contexto relacionado: esta función se agregó en la tarea #81 (commit `f76a28e`, 24/08/2026, documentado en `docs/punto-de-partida-session de cierre-2026-08-24.md`), específicamente para resolver el problema de que un período quedaba "ACTIVO indefinidamente hasta que alguien lo cerrara a mano" (`docs/punto-de-partida-session de cierre-2026-08-19.md:45`). Esa sesión decidió conscientemente **no** agregar el aviso proactivo al Dashboard ("para no sumarle más complejidad") y lo dejó solo dentro de la pantalla de Períodos Operativos — pero ese aviso es *preventivo* (antes del cierre, "vence en N días"); no existe ningún aviso *posterior* al cierre (automático o manual) en ningún lado. La validación en vivo de esa sesión confirmó que el mecanismo de auto-cierre funciona, pero se hizo sobre un rango sin clases PROGRAMADA residuales ("cero efectos colaterales") — es decir, nunca se validó el caso con clases realmente afectadas, que es justamente el caso que esta auditoría señala como no comunicado.
**Impacto para el usuario:** un administrador puede descubrir semanas después, al revisar reportes o al intentar entender por qué ciertas clases quedaron SUSPENDIDA, que un período se cerró solo, sin haber tomado esa decisión conscientemente ni haber podido revisar antes las consecuencias.
**Recomendación:** (no implementar) al menos, persistir de algún modo visible que el último cierre fue automático y con qué resultado (ej. un campo o log consultable desde la pantalla de Períodos Operativos), y considerar mostrarlo como aviso destacado (no solo el proactivo de "por vencer") la primera vez que el usuario entra después de que ocurrió.

### UX-PER-002 — El texto de confirmación de "Cerrar período" describe mal la consecuencia real en cierres anticipados
**Prioridad:** P0  **Tipo:** MENSAJE / ACCIÓN DESTRUCTIVA  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos
**Acción:** click en "Cerrar período" (solo disponible para períodos ACTIVO, sin restricción de que sea exactamente el día de `fecha_hasta`) → modal de confirmación.
**Resultado esperado:** el texto de confirmación de una acción irreversible debe describir correctamente qué le va a pasar a los datos afectados.
**Resultado actual:** el modal dice literalmente: *"¿Cerrar este período? Las clases pendientes se marcarán como dictadas y no se van a poder hacer más cambios en el período. Esta acción no se puede deshacer."* (`app/protected/dashboard/periodos-operativos/page.tsx:372`). Pero según `cerrarPeriodo.ts` + `resolucionClaseService.ts`: de las clases PROGRAMADA dentro del rango del período, solo las que ya pasaron su fecha (`fechaYaPaso`) se marcan DICTADA; las que tienen fecha futura (que sí van a existir si se cierra el período *antes* de su `fecha_hasta`, cosa que la UI permite en cualquier momento) pasan a **SUSPENDIDA con causa PERIODO_OPERATIVO**, no a "dictadas". El texto omite por completo ese caso.
**Evidencia:** `lib/usecases/periodosOperativos/cerrarPeriodo.ts:39-45` (cuenta ambos casos por separado: `clasesMarcadasDictadas` y `clasesSuspendidasPorPeriodo`, prueba de que el propio código sabe que son dos resultados distintos) + `lib/services/resolucionClaseService.ts:40-46` (`fechaYaPaso ? DICTADA : SUSPENDIDA/PERIODO_OPERATIVO`).
**Impacto para el usuario:** quien cierra un período anticipadamente (ej. para arrancar el próximo antes de tiempo) cree que todo lo pendiente queda "dictado" (como si se hubiera dado clase), cuando en realidad esas clases futuras quedan suspendidas — un estado con implicancias distintas para reportes de módulos computables/liquidación.
**Recomendación:** (no implementar) corregir el texto para reflejar los dos casos, o directamente reemplazarlo por los contadores reales devueltos por el backend antes de confirmar (requiere un endpoint de "previsualización" o mostrar los contadores reales inmediatamente después, ver UX-PER-003).

### UX-PER-003 — Los contadores que cerrarPeriodo calcula se descartan; el usuario nunca ve el impacto real del cierre
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos
**Acción:** confirmar "Cerrar período".
**Resultado esperado:** dado que el backend ya calcula exactamente cuántas clases se marcaron DICTADA y cuántas quedaron SUSPENDIDA por el cierre (mismo patrón que "Activar", que sí muestra un resumen), cerrar un período debería mostrar un resumen equivalente.
**Resultado actual:** la función `cerrar()` del frontend solo verifica `res.ok` y, si es exitoso, hace `await cargarPeriodos()` — nunca lee el body de la respuesta. El objeto `{ periodo, clasesMarcadasDictadas, clasesSuspendidasPorPeriodo }` que devuelve la API (`app/api/periodos-operativos/[id]/cerrar/route.ts:29-30`) se pierde.
**Evidencia:** `app/protected/dashboard/periodos-operativos/page.tsx:315-332` (función `cerrar`), contrastar con `activar()` en el mismo archivo (líneas 283-311), que sí lee y muestra `data.clasesCreadas` / `data.distribucionesProcesadas` / `data.distribucionesSinModulos`.
**Impacto para el usuario:** después de una acción irreversible y crítica, la única señal de que "algo pasó" es que la fila cambia de "● Activo" a "■ Cerrado" en la tabla. No hay forma de saber, sin ir a buscar las clases una por una en otra pantalla, cuántas quedaron dictadas y cuántas suspendidas.
**Recomendación:** (no implementar) mostrar un aviso post-cierre con el mismo patrón que `avisoActivacion`, usando los datos que la API ya devuelve.

### UX-PER-004 — La causa de suspensión (PERIODO_OPERATIVO / CALENDARIO_ESCOLAR) no se muestra en ninguna pantalla de la app
**Prioridad:** P0  **Tipo:** FEEDBACK AUSENTE  **Fuente:** código (inferido)
**Pantalla:** transversal (no hay una pantalla de "clases" que lo muestre)
**Acción:** cualquier clase que el motor de resolución suspenda automáticamente por cierre de período o por un feriado.
**Resultado esperado:** dado que el prompt de esta auditoría pide específicamente verificar "cómo se comunica la causa PERIODO_OPERATIVO cuando suspende clases automáticamente", se esperaría al menos una pantalla (calendario de clases, detalle de clase, listado de incidencias) que traduzca el campo `causa` a un texto entendible.
**Resultado actual:** `grep -rln "causa" app/ --include="*.tsx"` no devuelve ningún archivo. El campo `Causa` (enum con valores INCIDENCIA, PERIODO_OPERATIVO, CALENDARIO_ESCOLAR, CAMBIO_DISTRIBUCION, NINGUNA) se calcula, persiste y hasta se usa para reportes internos (`lib/reporting/datasets/obtenerJornadas.ts`), pero no se renderiza en ninguna pantalla del frontend. Se confirmó además que la auditoría previa de Incidencias (`docs/auditoria-ux-incidencias-2026-08-25.md`) no menciona este campo — es un hallazgo nuevo, no una repetición.
**Impacto para el usuario:** un docente o preceptor que ve una clase SUSPENDIDA (en cualquier pantalla que las liste, fuera de este módulo) no tiene forma de distinguir si fue por un feriado, por el cierre del período, por una incidencia, o por un cambio de distribución.
**Recomendación:** (no implementar) documentar como hallazgo transversal para la pantalla que efectivamente liste `ClaseProgramada` con su estado (fuera de este módulo) — acá se deja registrado porque el prompt de esta fase lo pidió explícitamente y porque las dos causas en cuestión (PERIODO_OPERATIVO, CALENDARIO_ESCOLAR) se originan exclusivamente en este módulo.

### UX-PER-005 — "Activar" período no tiene confirmación pese a generar y reconciliar clases en toda la institución
**Prioridad:** P1  **Tipo:** ACCIÓN DESTRUCTIVA  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos
**Acción:** click en "Activar" (fila con estado BORRADOR).
**Resultado esperado:** consistencia con "Cerrar período" (acción de criticidad comparable, que sí pide confirmación) — o al menos algún paso intermedio antes de generar clases reales.
**Resultado actual:** `onClick={() => activar(p.id)}` ejecuta la acción inmediatamente, sin modal (`app/protected/dashboard/periodos-operativos/page.tsx:611-616`). `activarPeriodo.ts` genera `ClaseProgramada` para todas las distribuciones vigentes (potencialmente con `fecha_desde` retroactiva) y además reconcilia **todas** las clases existentes de la institución contra el nuevo rango (`claseProgramadaService.reconciliarPorPeriodoOperativo`), lo que puede suspender clases que estaban PROGRAMADA por quedar fuera del nuevo rango vigente.
**Evidencia:** `lib/usecases/periodosOperativos/activarPeriodo.ts:18-104`; comparar con el modal sí presente para `cerrar` en la misma página (líneas 370-377).
**Impacto para el usuario:** un click accidental (o un doble-click, ver UX-PER-010) activa un período y dispara efectos masivos e inmediatos sin ninguna instancia de "¿estás seguro?", justo lo opuesto al patrón que el mismo módulo usa para Cerrar y Eliminar.
**Recomendación:** (no implementar) agregar confirmación, especialmente cuando `fecha_desde` sea pasada (activación retroactiva) o cuando ya existan clases de otras distribuciones que la reconciliación vaya a tocar.

### UX-PER-006 — El aviso post-activación ignora las clases que la reconciliación suspendió/revirtió fuera de la nueva generación
**Prioridad:** P1  **Tipo:** FEEDBACK AUSENTE  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos
**Acción:** confirmar (click) "Activar".
**Resultado esperado:** el resumen post-activación debería reflejar todo el impacto real, no solo lo recién generado.
**Resultado actual:** `activarPeriodo` devuelve `{ periodo, distribucionesProcesadas, clasesCreadas, distribucionesSinModulos, ...reconciliacion }`, donde `reconciliacion` trae `suspendidas`, `revertidasACalendario` y `revertidasAProgramada` (conteos de `updateMany`, ver `lib/services/claseProgramadaService.ts:341-374`). El frontend (`activar()` en `page.tsx:283-311`) solo lee `clasesCreadas`, `distribucionesProcesadas` y `distribucionesSinModulos` — los tres campos de `reconciliacion` nunca se leen.
**Evidencia:** `lib/usecases/periodosOperativos/activarPeriodo.ts:97-103` vs. `app/protected/dashboard/periodos-operativos/page.tsx:294-306`.
**Impacto para el usuario:** si activar un período (sobre todo uno retroactivo, o después de reactivar por error un BORRADOR viejo) suspende clases de asignaciones que quedaron fuera del nuevo rango, el usuario no se entera desde esta pantalla.
**Recomendación:** (no implementar) sumar esos contadores al mensaje existente, mismo patrón que ya se usa para `distribucionesSinModulos`.

### UX-PER-007 — "No se puede deshacer" en Eliminar contradice la existencia de "Restaurar" en la misma pantalla
**Prioridad:** P1  **Tipo:** MENSAJE / ACCIÓN DESTRUCTIVA  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos y Calendario Escolar (mismo patrón en ambas)
**Acción:** click en "Eliminar" (período o evento de calendario) → modal.
**Resultado esperado:** el texto de una confirmación debe ser consistente con lo que la propia pantalla permite hacer después.
**Resultado actual:** ambos modales dicen "Esta acción no se puede deshacer" (`periodos-operativos/page.tsx:365`, `calendario/page.tsx:358`), pero eliminar es un soft-delete: el registro queda con `deletedAt` seteado y aparece con badge "Eliminado" al tildar "Ver eliminados", con un botón "Restaurar" al lado (`periodos-operativos/page.tsx:585-591`, `calendario/page.tsx:591-597`) que lo revierte por completo (`eliminarPeriodo`/`restaurarPeriodo`, `eliminarCalendarioEscolar`/`reactivarCalendarioEscolar`).
**Evidencia:** `lib/repositories/periodoOperativoRepository.ts:84-96` (`eliminar`/`reactivar` solo tocan `deletedAt`), `lib/repositories/calendarioEscolarRepository.ts:174-215` (ídem con `activo`/`deletedAt`).
**Impacto para el usuario:** por un lado genera alarma innecesaria ante una acción que sí se puede deshacer; por otro, desgasta la credibilidad del mismo texto de advertencia cuando aparece en una acción que sí es irreversible (Cerrar período, que correctamente no tiene "Restaurar" en ningún lado).
**Recomendación:** (no implementar) cambiar el texto a algo como "Podés restaurarlo después desde 'Ver eliminados'", reservando "no se puede deshacer" para Cerrar período, que es la única acción de este módulo donde es cierto.

### UX-PER-008 — Sin validación de superposición de fechas entre Períodos Operativos
**Prioridad:** P1  **Tipo:** VALIDACIÓN DE NEGOCIO  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos
**Acción:** Crear o Editar un período (fecha_desde/fecha_hasta).
**Resultado esperado:** dado que existe un método de repositorio dedicado a esta validación (`verificarSuperposicion`), y que el mismo patrón sí está conectado para `Incidencia` (`incidenciaRepository.verificarSuperposicion`, usado en `crearIncidencia`, `actualizarIncidencia`, `reactivarIncidencia`), se esperaría el mismo control acá.
**Resultado actual:** `periodoOperativoRepository.verificarSuperposicion` (`lib/repositories/periodoOperativoRepository.ts:106-122`) existe pero no lo invoca ningún usecase — ni `crearPeriodo.ts` ni `actualizarPeriodo.ts` lo llaman. La única restricción real es el `@@unique([institucionId, nombre])` del schema (nombres duplicados), que no tiene nada que ver con fechas.
**Evidencia:** búsqueda `grep -rn "verificarSuperposicion"` — únicos usos reales son en `incidenciaRepository`; la versión de `periodoOperativoRepository` no aparece invocada en ningún usecase ni ruta.
**Impacto para el usuario:** se puede crear (o editar, mientras esté en BORRADOR) un período con fechas que se superponen con el período ACTIVO o con otro BORRADOR/CERRADO, sin ningún aviso. No se pudo determinar con certeza el impacto exacto sobre generación de clases en ese escenario sin trazar `claseProgramadaService.generarParaRango` en profundidad — **RIESGO / NO CONFIRMADO**, requeriría prueba en vivo con dos períodos superpuestos.
**Recomendación:** (no implementar) conectar `verificarSuperposicion` en `crearPeriodo`/`actualizarPeriodo`, igual que en Incidencias.

### UX-PER-009 — Ningún flujo de Calendario Escolar informa cuántas clases se vieron afectadas
**Prioridad:** P1  **Tipo:** FEEDBACK AUSENTE  **Fuente:** código (inferido)
**Pantalla:** Calendario Escolar
**Acción:** Crear, Editar (tocando `suspendeClases`), Eliminar o Restaurar un evento.
**Resultado esperado:** si marcar/desmarcar "Suspende clases" cambia el estado de clases ya generadas, la UI debería decir cuántas.
**Resultado actual:** los cuatro usecases (`crearCalendarioEscolar`, `actualizarCalendarioEscolar`, `eliminarCalendarioEscolar`, `reactivarCalendarioEscolar`) llaman a `claseProgramadaService.resolverClasesPorCalendario(...)`, que **sí devuelve** `{ actualizadas }` (`lib/services/claseProgramadaService.ts:299-320`), pero ninguno de los cuatro usecases usa ni propaga ese valor — todos hacen `await claseProgramadaService.resolverClasesPorCalendario(...)` sin capturar el resultado, y devuelven solo el registro de `CalendarioEscolar`. La API y el frontend nunca lo ven.
**Evidencia:** `lib/usecases/calendarioEscolar/crearCalendarioEscolar.ts:86-91`, `actualizarCalendarioEscolar.ts:96-101`, `eliminarCalendarioEscolar.ts:47-52`, `reactivarCalendarioEscolar.ts:45-50` (los cuatro descartan el valor de retorno).
**Impacto para el usuario:** carga un feriado con "Suspende clases" tildado y no tiene ninguna confirmación de que efectivamente suspendió algo (ni cuánto): la tabla de eventos se recarga, pero no la de clases.
**Recomendación:** (no implementar) propagar `actualizadas` hasta la respuesta de cada endpoint y mostrarlo como aviso, mismo patrón que `avisoActivacion`.

### UX-PER-010 — Sin guard anti doble-envío ni estado de carga visible en Activar / Cerrar / Restaurar
**Prioridad:** P2  **Tipo:** ESTADO  **Fuente:** código (inferido)
**Pantalla:** Períodos Operativos y Calendario Escolar
**Acción:** click en "Activar", "Cerrar período" (confirmar en el modal), "Restaurar".
**Resultado esperado:** mismo patrón que "Guardar cambios"/"Crear período", que sí deshabilita el botón y muestra "Guardando..." mientras `guardando` es `true`.
**Resultado actual:** `activar()`, `cerrar()` y `restaurar()` no tienen ningún estado de "procesando" — el botón no se deshabilita ni cambia de texto durante el `fetch`. Un doble-click dispara dos requests; para Cerrar, el segundo probablemente falle con "Solo se puede cerrar un período en estado ACTIVO" (409) mostrado como error genérico, lo cual es confuso justo después de haber tenido éxito. Este mismo patrón ya fue identificado y corregido en el módulo de Asignaciones (#122, `84be1ef`, guard con `useRef`), pero no se replicó acá.
**Evidencia:** `app/protected/dashboard/periodos-operativos/page.tsx:283-351` (`activar`, `cerrar`, `restaurar`, ninguna usa un flag de guardando/disabled).
**Impacto para el usuario:** en una red lenta, un doble-click puede generar un error post-éxito que hace dudar si la acción se aplicó bien.
**Recomendación:** (no implementar) mismo guard que ya existe en Asignaciones.

### UX-PER-011 — No hay restricción real de fecha duplicada en Calendario Escolar; el manejo de error P2002 es código muerto
**Prioridad:** P2  **Tipo:** VALIDACIÓN DE NEGOCIO  **Fuente:** código (inferido)
**Pantalla:** Calendario Escolar
**Acción:** crear un evento en una fecha donde ya existe otro evento.
**Resultado esperado:** o bien se permite conscientemente (con aviso), o bien se valida y bloquea con un mensaje claro.
**Resultado actual:** `app/api/calendario-escolar/route.ts:63-65` atrapa `Prisma.PrismaClientKnownRequestError` código `P2002` y devuelve "Ya existe un evento para esa fecha en esta institución" — pero el modelo `CalendarioEscolar` en `prisma/schema.prisma:542-568` no tiene ningún `@@unique` sobre `fecha` (ni combinado con `institucionId` ni con `periodoOperativoId`), solo índices no únicos. Ese branch de manejo de error es inalcanzable: se pueden cargar dos (o más) eventos para la misma fecha sin ningún bloqueo ni aviso.
**Evidencia:** comparar el catch de P2002 en la ruta con la definición completa del modelo (sin `@@unique`).
**Impacto para el usuario:** posible carga duplicada de feriados en la misma fecha sin que nada lo detecte; además, el código sugiere una garantía de integridad que en realidad no existe.
**Recomendación:** (no implementar) decidir si se quiere esa unicidad (agregar el índice) o quitar el manejo de error muerto para no sugerir una protección inexistente.

### UX-PER-012 — Sin verificación de rol visible para acciones críticas del módulo
**Prioridad:** P2  **Tipo:** PERMISOS  **Fuente:** código (inferido) — RIESGO / NO CONFIRMADO
**Pantalla:** Períodos Operativos y Calendario Escolar
**Acción:** Cerrar, Activar, Eliminar período; modificar calendario.
**Resultado esperado:** acciones de esta criticidad (afectan a toda la institución) deberían estar restringidas a un rol administrativo.
**Resultado actual:** `useAuth.ts` solo verifica que exista un token en `sessionStorage`, sin rol. `withContext.ts` solo valida que existan `x-user-id`/`x-tenant-id` numéricos, sin rol. Ningún usecase de este módulo recibe ni chequea un rol. No se pudo confirmar si el proxy que inyecta esos headers (mencionado en el comentario de `withContext.ts:2-4`, fuera de los archivos revisados) aplica algún control de rol antes de llegar acá — **RIESGO / NO CONFIRMADO**, requeriría ver el middleware/proxy real, que no se identificó dentro del alcance de este módulo.
**Evidencia:** `app/hooks/useAuth.ts`, `lib/auth/withContext.ts:71-93`.
**Impacto para el usuario:** si el proxy no filtra por rol, cualquier usuario autenticado de la institución (docente, preceptor) podría cerrar el período operativo activo.
**Recomendación:** (no implementar) confirmar contra el proxy/middleware real si hay control de rol; si no lo hay, es un hallazgo de severidad mayor que P2.

### UX-PER-013 — Comentario de cabecera desactualizado en `calendario/page.tsx`
**Prioridad:** P3  **Tipo:** CONSISTENCIA  **Fuente:** código (inferido)
**Pantalla:** Calendario Escolar
**Acción:** ninguna (no es user-facing).
**Resultado esperado:** el comentario de la primera línea del archivo debería reflejar su ruta real.
**Resultado actual:** dice `// app/protected/dashboard/calendario-escolar/page.tsx`; la ruta real (y la que aparece en el Sidebar) es `app/protected/dashboard/calendario/page.tsx`.
**Evidencia:** `app/protected/dashboard/calendario/page.tsx:1`.
**Impacto para el usuario:** ninguno directo; puede confundir a quien busque el archivo por el nombre de ruta equivocado.
**Recomendación:** (no implementar) corregir el comentario.

## 7. Pantallas auditadas sin problemas relevantes

- **Estado vacío de Calendario Escolar** (sin ningún período creado): mensaje claro + link directo a la pantalla correcta. Buen patrón.
- **Restricción de edición de fechas en período ACTIVO** (`CampoEstructuralEnPeriodoActivoError`): correctamente bloqueada en backend y coherente con lo que expone la UI (el botón "Editar" ni siquiera aparece para períodos ACTIVO).
- **Validación de rango de fecha en formulario de Calendario Escolar**: los inputs de fecha usan `min`/`max` nativos acotados al período seleccionado, y cambiar el selector de período cancela cualquier formulario abierto (evita enviar una fecha del período incorrecto).
- **Mensajes de error de negocio específicos** (`YaHayPeriodoActivoError`, `PeriodoCerradoError`, `NoSePuedeEliminarPeriodoActivoError`, etc.): cada uno tiene su propia clase de error con mensaje en español entendible, mapeado a un código HTTP apropiado (404/409/400), y el frontend los muestra tal cual sin envolver en un mensaje técnico genérico — patrón correcto y consistente con otras auditorías previas del proyecto.
- **Aviso proactivo de período por vencer / sin período activo**: implementado y calculado correctamente en el cliente sin requests extra (decisión de diseño documentada en #81).

## 8. Áreas que no pudieron verificarse

- **Prueba en vivo de cualquier flujo** (crear/cerrar/activar un período real, cargar un feriado y ver su efecto en clases generadas): no hubo navegador disponible en esta sesión. Todo el análisis es por lectura de código.
- **Control de rol en el proxy upstream** que inyecta `x-user-id`/`x-tenant-id` (UX-PER-012): el archivo de ese proxy no fue identificado dentro de los límites de este módulo.
- **Efecto exacto de dos períodos con fechas superpuestas** sobre `claseProgramadaService.generarParaRango` (UX-PER-008): se confirmó la ausencia de validación, pero no se trazó el efecto completo en generación de clases hasta el final.
- **Comportamiento real de `resolverClasesVencidas` cuando falla dentro de `activarPeriodo`** (try/catch best-effort, línea 92-96 de `activarPeriodo.ts`): no se evaluó qué tan seguido ocurre en producción ni si el silencio ahí es aceptable — se menciona pero no se abrió como hallazgo separado por bajo impacto aparente.

## 9. Lista priorizada de correcciones (sin implementar)

1. UX-PER-001 (P0) — comunicar de algún modo el cierre automático de período y su impacto.
2. UX-PER-002 (P0) — corregir el texto de confirmación de "Cerrar período" para cierres anticipados.
3. UX-PER-003 (P0) — mostrar los contadores reales que devuelve `cerrarPeriodo` tras confirmar.
4. UX-PER-004 (P0) — decidir dónde y cómo mostrar la causa de suspensión de una clase (fuera de este módulo, pero originado acá).
5. UX-PER-005 (P1) — agregar confirmación a "Activar".
6. UX-PER-006 (P1) — mostrar en el aviso post-activación los datos de `reconciliacion` que ya devuelve el backend.
7. UX-PER-007 (P1) — corregir el texto "no se puede deshacer" en Eliminar (período y evento de calendario).
8. UX-PER-008 (P1) — conectar `verificarSuperposicion` en `crearPeriodo`/`actualizarPeriodo`.
9. UX-PER-009 (P1) — propagar y mostrar `actualizadas` en los 4 flujos de Calendario Escolar.
10. UX-PER-010 (P2) — guard anti doble-envío en Activar/Cerrar/Restaurar.
11. UX-PER-011 (P2) — resolver la contradicción entre el manejo de P2002 y la ausencia de `@@unique` en `CalendarioEscolar`.
12. UX-PER-012 (P2, condicionado a confirmar el riesgo) — verificar/agregar control de rol para estas acciones.
13. UX-PER-013 (P3) — corregir comentario de ruta en `calendario/page.tsx`.
