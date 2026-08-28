# Punto de partida — sesión de cierre 28/08/2026

## Contexto

Continuación de la sesión del 27/08. Objetivo del día: cerrar el último hallazgo pendiente de la auditoría UX de Incidencias (#97), diseñar e implementar los dos hallazgos nuevos registrados ayer (#101, #102), y arrancar la fase 2/10 de la auditoría UX (módulo Reemplazos) en paralelo vía Claude Code.

## Cerrado y commiteado hoy

- **#97 — UX-INC-010 (P3, opcional)**: cerrado como mejora diferida, de común acuerdo, sin implementar código. Con esto, los 12 hallazgos originales de la auditoría de Incidencias quedan resueltos (11 con código, 1 diferido a propósito).
- **#102 — "Ausencia del suplente" no soportaba más de un suplente distinto**: rediseñado. En vez de un botón por suplente, el modal deduce reactivamente a partir de las fechas que carga el usuario qué suplente corresponde (usando las clases y reemplazos ya cargados por `useClasesAfectadas`), bloqueando el guardado si el rango es ambiguo (cruza más de un suplente) o no tiene cobertura. La contención de fechas hija-dentro-de-padre ya estaba garantizada server-side desde #84 (`crearIncidencia.ts`), no hizo falta tocarla. Validado en vivo con incidencia #4 (Perez/Juarez, 4 escenarios: dos rangos ambiguos bloqueados, dos rangos de un día resolviendo al suplente correcto). Commit `a7a4af7`.
- **#101 — Separar incidencias del período activo de las históricas**: el listado ahora muestra por defecto solo las incidencias del período operativo activo (o todas si no hay ninguno activo), ordenadas por id ascendente, con columna ID nueva (no existía). Selector "Ver histórico" permite elegir un período cerrado y opcionalmente acotar a un tramo de fechas dentro de él. Todo client-side sobre datos ya cargados, reusando `GET /api/periodos-operativos` existente — sin cambios de backend. Validado en vivo. Commit `761f21e`.

## En curso — fase 2/10 de la auditoría UX (módulo Reemplazos)

Se corrigió y entregó el prompt de la fase 2/10 (mismo criterio que la fase 1: se corrigió una fecha desactualizada en el nombre de archivo esperado). Claude Code corrió la auditoría en paralelo mientras acá se trabajaba en #101/#102. Resultado: `docs/auditoria-ux-reemplazos-2026-08-28.md`, con 6 hallazgos (UX-REE-001 a UX-REE-006), ya registrados como tareas #103–#108.

El más importante es **UX-REE-001 (P0)**: `reasignarReemplazoAIncidencia` (el use case detrás de "Ausencia del suplente") no aplica ninguna de las tres validaciones de negocio que sí aplica `crearReemplazo` (auto-reemplazo, superposición del suplente, reemplazo activo existente). **Se confirmó hoy leyendo el código actual** (no tocado por el trabajo de hoy en #101/#102, que solo modificó el frontend del modal) — el hallazgo es real y sigue vigente.

Nota sobre la auditoría: se hizo íntegramente por lectura de código, sin acceso a navegador — todo está marcado "Fuente: código (inferido)". Detalle de metadata a tener en cuenta: el commit citado en el documento (`c317be9`) es anterior al trabajo de hoy, pero la sección 4.3 describe el comportamiento que implementamos hoy en #102 (deducción de suplente por fecha) — probablemente Claude Code leyó los archivos vigentes del disco aunque citó un commit viejo en el encabezado. No invalida el análisis, pero esa línea puntual no es confiable.

**PENDIENTE, no confirmado**: el documento `docs/auditoria-ux-reemplazos-2026-08-28.md` sigue sin commitear (queda como untracked en el repo).

## Hallazgos de la auditoría de Reemplazos — registrados sin implementar

- **#103 — UX-REE-001 (P0)**: `reasignarReemplazoAIncidencia` no valida auto-reemplazo ni superposición del suplente. Confirmado hoy. Falta leer `crearReemplazo.ts` y `validarSuperposicion.ts` para diseñar el fix exacto (reusar `validarSuperposicionSuplente`/`obtenerAgenteQueSeReemplaza`).
- **#104 — UX-REE-002 (P1)**: "Quitar" reemplazo sin confirmación ni estado de carga por fila.
- **#105 — UX-REE-003 (P1)**: aviso de reasignaciones fallidas en "Ausencia del suplente" no dice por qué fallaron (se descarta el motivo de cada rechazo).
- **#106 — UX-REE-004 (P2, no confirmado con negocio)**: no existe pantalla de listado agregado de reemplazos activos — los endpoints GET existen y están testeados pero sin consumidor en el frontend.
- **#107 — UX-REE-005 (P2)**: "+ Agregar" reemplazo se ofrece también en clases PROGRAMADA/DICTADA, no solo SUSPENDIDA.
- **#108 — UX-REE-006 (P2, opcional, no confirmado)**: orden de validaciones en `crearReemplazo` podría dar el mensaje de error equivocado en un escenario de carrera (bajo impacto, la UI normal no lo permite).

Ninguno de los seis se implementó todavía — quedan a la espera de diseño/autorización, mismo criterio que se usó toda la sesión.

## Para la próxima sesión

1. Confirmar si `docs/auditoria-ux-reemplazos-2026-08-28.md` quedó commiteado; si no, commitearlo.
2. Terminar de diseñar y, si se aprueba, implementar **#103** (UX-REE-001, P0) — es el más urgente de los seis, mismo tipo de gap de validación de negocio que tocamos hoy en #102 pero del lado del backend.
3. Seguir con #104–#108 en orden de prioridad, cada uno con diseño confirmado antes de tocar código.
4. Una vez cerrados los hallazgos de Reemplazos (o decidido posponer alguno), evaluar arrancar la fase 3/10 de la auditoría UX (siguiente módulo, todavía sin definir cuál).
5. Pendientes de más largo plazo, sin tocar todavía: #11 (seed real de Colegio Ceferino/Codigario), evaluación general del proyecto (código, riesgos, ritmo, pendientes) — mencionada en cierres anteriores, nunca completada.
