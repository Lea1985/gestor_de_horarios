# Punto de partida — sesión de cierre 30/08/2026

## Contexto

Continuación del 28/08. Objetivo del día: cerrar los hallazgos pendientes de la auditoría UX de Reemplazos (fase 2/10, #103-#108) y revisar el resultado de la fase 3/10 (Asignaciones), corrida en paralelo por Claude Code.

## Cerrado y commiteado hoy

- Doc de la auditoría de Reemplazos, que había quedado pendiente de ayer: commiteado (`8ff1d66`, 207 inserciones).
- **#103 — UX-REE-001 (P0)**: `reasignarReemplazoAIncidencia` no validaba auto-reemplazo ni superposición del suplente. Ahora reusa `validarSuperposicionSuplente`/`obtenerAgenteQueSeReemplaza` de `crearReemplazo`, mismos errores tipados, mapeados a 409 en la ruta. El frontend excluye del selector "Nuevo suplente" al agente ya identificado como el que se está reemplazando. Validado en vivo en incidencia #4 (el suplente actual no aparece en el desplegable, una reasignación válida a otro suplente se completó bien). Commit `b39162d`.
- **#104 — UX-REE-002 (P1)**: "Quitar" reemplazo ahora pide confirmación (`ModalConfirmar`, mismo patrón que incidencias), tiene estado de carga por fila ("Quitando...", botón deshabilitado durante la petición) y el error queda pegado a la fila afectada en vez del banner general de arriba. Validado en vivo. Commit `61f7af4`.
- **#105 — UX-REE-003 (P1)**: el aviso de reasignaciones fallidas en "Ausencia del suplente" ahora muestra el motivo de cada rechazo (fecha, módulo, mensaje del backend), no solo el conteo. Aceptado por revisión de código (lógica sincrónica pura, camino feliz no la ejercita) sin forzar una reproducción en vivo -- hubiera requerido un agente con conflicto de horario real. Commit `01fb12f`.
- **#107 — UX-REE-005 (P2)**: "+ Agregar" reemplazo ahora se restringe a clases en estado SUSPENDIDA -- antes se ofrecía también en PROGRAMADA/DICTADA, donde no hay nada que reemplazar. Mismo criterio que ya usaba `PasoReemplazos.tsx`. Aceptado por revisión de código. Commit `41a0d99`.

## Hallazgo nuevo en vivo, deprioritizado

- **#109**: al validar #103 en vivo se notó que la incidencia hija de "Ausencia del suplente" se atribuye TODOS los módulos del día, no solo el que cubría el suplente ausente -- es una característica general del modelo de incidencias (alcance por asignación+fecha, no por módulo), no un bug puntual de hoy. Deprioritizado: el usuario aclaró que en la práctica un suplente siempre cubre todos los módulos del día, no hay cobertura parcial real, así que el escenario casi no se da con datos reales.

## Pendiente de Reemplazos, sin implementar

- **#106 — UX-REE-004 (P2, no confirmado con negocio)**: no existe pantalla de listado agregado de reemplazos activos (los endpoints GET existen y están testeados, sin consumidor). Necesita que el usuario confirme si es un requerimiento real antes de diseñar nada.
- **#108 — UX-REE-006 (P2, opcional)**: orden de validaciones en `crearReemplazo`, bajo impacto, no alcanzable desde la UI normal. Recomendado no priorizar.

## Fase 3/10 de la auditoría UX — Asignaciones

Prompt corregido (fecha desactualizada en el nombre de archivo esperado, mismo tipo de corrección que en las fases 1 y 2) y entregado a Claude Code, corrió en paralelo con el trabajo de Reemplazos. Tuvo un corte a mitad de camino ("API Error: No response from API" tras 54 min), se resolvió escribiendo "continuá" en la misma sesión sin perder el contexto ya leído (36 archivos, 6 patrones buscados). Resultado: `docs/auditoria-ux-asignaciones-2026-08-30.md`, 13 hallazgos (UX-ASG-001 a UX-ASG-013), registrados como tareas #110-#122. Doc commiteado (`1720955`, 304 inserciones).

Dos hallazgos P0, ambos sobre el mismo eje (cambiar titular y su impacto en el historial):

- **#110 — UX-ASG-001**: "Cambiar titular" nunca envía `fechaDesde` al backend (que sí lo soporta vía `cambiarTitularAsignacion`) -- siempre usa "hoy" como fecha de corte, sin importar cuándo ocurrió el cambio real. **Confirmado hoy leyendo el código**: `CambiarTitularForm.tsx` no tiene ningún campo de fecha, y `asignacionesService.cambiarTitular()` solo manda `agenteId`.
- **#111 — UX-ASG-002**: no existe ninguna pantalla que muestre el historial de titulares de una asignación -- el endpoint `GET /api/asignaciones/[id]/titular` (`listarTitulares`) ya existe pero ningún componente lo consume.

Hallazgo estructural transversal, **#115 (UX-ASG-006)**: las acciones de fila del listado (Editar/Cambiar titular/Eliminar/Reactivar) están completamente implementadas en el hook pero ningún botón de la tabla las dispara -- código muerto, sin pérdida funcional porque todo es alcanzable desde el detalle. Es la tercera vez en las 3 auditorías de módulo que aparece este patrón (antes: el listado agregado de reemplazos sin consumidor -- UX-REE-004 --, y el include sin filtrar de "hijos" en incidencias de la sesión anterior). Parece una característica recurrente de cómo fue creciendo el proyecto, vale la pena una pasada específica más adelante buscando más código huérfano de este tipo.

Resto de hallazgos de Asignaciones (P1/P2/P3), ninguno implementado todavía:
- #112, #113, #114 (P1, ligados a "Cambiar titular"): sin confirmación antes de guardar (riesgo alto según la auditoría), riesgo de crear un registro de historial espurio si se confirma sin cambiar la selección, mensaje de "Eliminar" inexacto y distinto entre listado y detalle.
- #116, #117 (P1): tres cálculos independientes de "tiene historial" que pueden divergir (backend/detalle/editar), falta de validación turno↔comisión al editar (sí existe al crear).
- #118-#121 (P2): "Eliminar" no anticipa el bloqueo por reemplazos activos (solo por incidencias), incidencias eliminadas se muestran sin distinguir de las activas, el campo `estado` (SUSPENDIDO) no es editable desde ninguna UI, textos de aviso de edición restringida inconsistentes entre dos formularios.
- #122 (P3, opcional): falta guard explícito contra doble submit, bajo impacto.

## Para la próxima sesión

1. Decidir con el usuario si #106 (pantalla de listado agregado de reemplazos) es un requerimiento real antes de diseñarlo.
2. Empezar a resolver los hallazgos de Asignaciones -- probablemente arrancar por los P0 (#110, #111), que están relacionados entre sí: la fecha de cambio de titular y la pantalla de historial que permitiría verificar que quedó bien registrada.
3. #108 y #122 quedan de baja prioridad -- evaluar si vale la pena tocarlos en algún momento o cerrarlos directamente como "no se va a hacer" (mismo criterio ya usado con #97).
4. Una vez resuelto Asignaciones (o decidido posponer algún hallazgo), arrancar la fase 4/10 de la auditoría UX (siguiente módulo, todavía sin definir cuál).
5. Pendiente transversal: al terminar la ronda de 10 auditorías, considerar una pasada específica buscando código muerto/huérfano -- patrón que ya apareció 3 veces (UX-REE-004, "hijos" sin filtrar en incidencias, UX-ASG-006).
6. Pendientes de más largo plazo, sin tocar todavía: #11 (seed real de Colegio Ceferino/Codigario), evaluación general del proyecto (código, riesgos, ritmo, pendientes).
