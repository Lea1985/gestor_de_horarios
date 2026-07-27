Punto de partida — ClaseProgramada — 2026-07-27

Continuación de punto-de-partida-clase-programada-2026-07-25.md. Ese documento dejaba 6 puntos pendientes: PERIODO_OPERATIVO (resuelto en sesión intermedia, no cubierta por este documento), y código muerto sin decisión (punto 6). Esta sesión se dedicó a: (1) cerrar la limpieza de código muerto pendiente, y (2) por primera vez, correr la suite completa de tests contra un servidor real — lo que destapó una tanda de bugs y problemas de entorno que nunca se habían visto porque ninguna corrida anterior había llegado a ejecutarse de punta a punta.

Confirmado esta sesión

Limpieza de código muerto (tarea #12, cerrada):

Removidas generarParaDistribucion, eliminarFuturas, suspenderFuturas de claseProgramadaRepository.ts (y el tipo ClaseACrear, que solo usaba la primera).
Removidas detectarReemplazosParaMigrar, migrarReemplazosAIncidencias de reemplazoRepository.ts.
Hallazgo adicional durante la limpieza: reemplazoRepository.crear() y .eliminar() escribían estado en ClaseProgramada a mano, dentro de su propia transacción, redundante con el resolverClase() que el usecase llama inmediatamente después. En .eliminar() esto era más que ruido: dejaba momentáneamente estado: PROGRAMADA sin tocar causa, una combinación que la tabla de precedencia nunca produciría (ej. causa: INCIDENCIA + estado: PROGRAMADA). No rompía nada porque resolverClase lo pisaba enseguida, pero se sacó igual — el repository no necesita tocar ClaseProgramada, es responsabilidad exclusiva del motor.

Suite de tests corrida por primera vez con servidor real (319/365 al cierre de la sesión):

Diagnóstico del problema real detrás de la corrida masiva fallida: no era un bug de tests ni de suite, sino que el servidor de dev:test (puerto 3000) no estaba levantado — confirmado con curl devolviendo 000 y ps aux sin ningún proceso next dev. Causa probable: nohup npm run dev:test & sin disown no sobrevive al cierre de la sesión de shell que lo lanzó. Fix aplicado: nohup ... & disown más un polling de curl antes de correr vitest.
tests/clases.test.ts — mismo bug de fixture visto en otros archivos (agenteId directo en Asignacion.create, campo removido del schema; falta turnoId, requerido). Corregido. Se confirmó además que este archivo no es redundante con generacion-clases.test.ts: cubre una superficie de API completamente distinta (POST /api/clases/generar, GET /api/clases, GET/PATCH /api/clases/[id]) que ningún otro test toca.
tests/agentes.test.ts — 6 fallos por un supuesto incorrecto del test, no un bug de producción: esperaba data.agente.{id,documento} (envuelto), pero POST/GET /api/agentes devuelven el registro plano. Confirmado comparando contra PATCH (que ya esperaba data.email plano y pasaba) y contra obtenerAgente.ts/crearAgente.ts (ambos devuelven el registro de agenteRepository sin envolver). Corregido en el test.
lib/repositories/horarioRepository.ts — bug real de producción: el claseInclude compartido por listarSemana/listarSemanaInstitucion seleccionaba asignacion.agente (relación que ya no existe — el titular vive en TitularAsignacion) y reemplazos.asignacionSuplente (nombre de campo incorrecto; el real es agenteSuplente, relación directa a Agente). Un select de Prisma con campos inexistentes tira PrismaClientValidationError, no atrapado en el repository, que sube crudo hasta el catch genérico de la ruta y sale como 500. Esto significa que GET /api/horario y GET /api/horario/institucion estaban rotos en el 100% de los llamados. Corregido (asignacion.titularidades con where: {activo:true, fecha_hasta:null}, y agenteSuplente directo).
Docker CLI no encontrado en WSL (checkEntornoWSL.test.ts, preDesarrollo.test.ts) — no es un bug de código, es que el CLI de docker no está en el PATH de esa distro aunque Postgres funcione vía la integración de Docker Desktop. Pendiente de decisión de entorno, no de código.
Descubrimientos nuevos, sin resolver
Posible bypass del motor en PATCH /api/clases/[id]. El test permite setear estado: DICTADA/SUSPENDIDA directo. No se vio el código de la ruta/usecase todavía — si escribe estado sin pasar por resolverClase (sin causa: MANUAL, sin incrementar versionResolucion), sería el mismo patrón de bypass ya encontrado y corregido dos veces esta sesión (reasignarReemplazoAIncidencia.ts, reemplazoRepository.crear/eliminar). Alta prioridad para la próxima sesión — es el mismo bug de clase, por tercera vez.
codigarios.test.ts — 2 fallos con 500 donde se esperaba 409 (código duplicado en el mismo codigario) y 200 (delete idempotente de item inexistente). No se vio la ruta todavía.
distribuciones.test.ts — 1 fallo: POST /api/distribuciones/[id]/modulos ("asigna módulos") devuelve una respuesta cuya forma no coincide con lo que el test espera (data.data[0] es undefined). No se vio la ruta todavía.
Frontend — impacto real del bug de horarioRepository: cero. Se grepeó todo app/features/components buscando consumidores de /horario y /horario/institucion — no hay ninguno. El bug de producción era real pero no afectaba a ningún usuario hoy.
Frontend — hallazgo suelto, no relacionado al bug de horario: app/protected/dashboard/distribuciones/[id]/page.tsx (líneas 164-165) todavía usa dist.asignacion.agente (shape viejo, de antes de TitularAsignacion). No rompe la página (no hay chequeo con excepción, solo el nombre del titular nunca se muestra), pero es el único lugar del frontend que no migró — el resto ya usa titularidades[0]?.agente de forma consistente.
Frontend — cosmético: features/incidencias/types/index.ts:86 tiene un tipo asignacionSuplente que no se usa en ningún otro lugar (declaración huérfana, sin impacto en runtime).
Pendiente — orden sugerido para la próxima sesión
Confirmar con código (app/api/clases/[id]/route.ts + el usecase de actualización) si PATCH /api/clases/[id] bypasea resolverClase. Si lo hace, corregirlo con el mismo patrón que las dos correcciones anteriores de este tipo.
Ver la ruta de items del codigario y corregir los dos 500 (POST .../items duplicado, DELETE .../items/[itemId] idempotente).
Ver POST /api/distribuciones/[id]/modulos y decidir si el fix va en la ruta (shape real distinto al esperado) o en el test (expectativa desactualizada) — mismo criterio que se usó con agentes.test.ts.
Aplicar tests/clases.test.ts corregido y correr la suite completa de nuevo para confirmar 100% verde salvo los 2 tests de Docker.
Migrar dist.asignacion.agente a dist.asignacion.titularidades?.[0]?.agente en distribuciones/[id]/page.tsx (bajo impacto, cosmético, sin apuro).
Opcional: limpiar el tipo huérfano asignacionSuplente en features/incidencias/types/index.ts.
Decidir qué hacer con los 2 tests de Docker: activar la integración WSL de Docker Desktop, o marcarlos skip a sabiendas.
Recomendación

Los puntos 1 a 3 son los únicos que todavía requieren ver código nuevo y decidir un fix — arrancar por ahí, en ese orden (el 1 es el de mayor severidad potencial, mismo bug de clase visto dos veces antes). Los puntos 4 a 7 son mecánicos o de bajo impacto, resolubles en cualquier momento sin bloquear nada. Con esto la sesión de estabilización queda, en los hechos, cerrada salvo estos tres focos puntuales.