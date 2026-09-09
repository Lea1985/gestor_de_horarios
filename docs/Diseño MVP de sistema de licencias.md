# ALNEXT — Diseño MVP de sistema de licencias (registrado para después del piloto)

**Estado: NO INICIAR.** Este documento queda guardado para retomar recién cuando termine el piloto comercial actual. No crear ni tocar código de licencias hasta entonces.

## 1. Contexto y objetivo (resumen del documento original del usuario)

ALNEXT se instala localmente en cada institución, con su propia base de datos local — no es SaaS puro. Se necesita un mecanismo simple de activación y control de licencias para poder comercializar bajo suscripción y controlar el vencimiento cuando una institución deja de pagar.

Objetivo del MVP: identificar de forma única una instalación, activarla con una licencia, asociarla a una institución, definir inicio/vencimiento, validar periódicamente contra un servidor central, seguir funcionando temporalmente sin Internet, tener período de gracia, impedir modificaciones operativas cuando la licencia queda suspendida, y permitir renovar sin reinstalar.

**Principio no negociable:** ALNEXT sigue siendo local-first. Internet se usa solo para activación, validación periódica y renovación — nunca como dependencia permanente. No convertir ALNEXT en SaaS como parte de esta tarea.

## 2. Arquitectura propuesta (documento original)

- **License Server**: servidor central independiente (MVP simple, ej. Vercel), API mínima, sin billing complejo.
- **Modelo de datos** (sujeto a la arquitectura existente): `License { id, institutionId, installationId, plan, status, activatedAt, validUntil, lastValidationAt, createdAt, updatedAt }`.
- **Importante, ya remarcado en el doc original**: NO mezclar licencia/suscripción con `PeriodoOperativo`. `PeriodoOperativo` es dominio operativo/académico; la licencia es capa comercial/técnica. No tocar la lógica de `PeriodoOperativo` para resolver vencimientos comerciales.
- **Estados**: `ACTIVE` → `EXPIRING` (aviso, funciona normal) → `GRACE` (7 días propuestos, funciona con avisos) → `SUSPENDED` (modo restringido: permite login/consulta/visualización, impide creación y modificación operativa; nunca borra datos ni bloquea el acceso a información histórica).
- **Activación inicial**: generar `installationId` → ingresar código de activación → validar contra License Server → guardar licencia local. El `installationId` no debe depender de datos triviales de modificar, pero tampoco requiere fingerprinting avanzado de hardware para el MVP; no debe cambiar por un reinstall/actualización normal.
- **Validación periódica**: `POST /api/license/validate` con `{installationId, licenseId, version}`, respuesta con `{status, validUntil, serverTime}`.
- **No confiar solo en el reloj local**: guardar `lastServerTime`/`lastLocalTime` de la última validación exitosa para detectar retrocesos evidentes del reloj (objetivo: frenar el ataque trivial de "cambiar la fecha de Windows", no construir un sistema antifraude sofisticado).
- **Renovación**: manual desde el servidor (cambiar `validUntil`), sin reinstalar, sin Mercado Pago/facturación/portal de clientes en el MVP.
- **Panel administrativo**: mínimo — consultar/modificar institución, installationId, licenseId, plan, estado, fechas, y botones "Renovar 30/90 días", "Suspender", "Reactivar". Aceptable operar directo sobre la DB al principio, pero dejando estructura para un panel futuro.
- **Backup y restauración** (marcado como crítico en el doc original): restaurar un backup viejo NO debe poder retroceder el estado de la licencia. La solución debe mantener información de licencia fuera de lo que un restore de backup puede revertir.
- **Seguridad MVP**: HTTPS, no enviar datos operativos de la escuela, no guardar credenciales sensibles, no incluir clave privada de firma en la instalación local. Sin DRM ni fingerprinting avanzado.
- **Explícitamente fuera de alcance del MVP**: billing completo, Mercado Pago, facturación electrónica, portal de clientes, planes complejos, métricas comerciales avanzadas, DRM, fingerprinting avanzado, firma criptográfica compleja, SaaS, migración a cloud, multi-tenant cloud.
- **Criterios de aceptación**: 10 escenarios de prueba (activación, funcionamiento normal, aviso de vencimiento, vencimiento, gracia, suspensión, renovación, sin Internet, cambio de reloj, restauración de backup) — ver documento original completo en el chat del 08/09/2026 si hace falta el detalle literal de cada uno.
- **Plan de implementación por fases** (documento original): Fase 1 analizar arquitectura (sin tocar código) → Fase 2 License Server mínimo → Fase 3 activación local → Fase 4 validación periódica → Fase 5 estados → Fase 6 modo restringido → Fase 7 probar todos los escenarios.
- **Principio de diseño**: simplicidad por encima de sofisticación. No es el sistema definitivo para miles de instituciones, es lo suficientemente robusto para los primeros pilotos. Evitar sobreingeniería. No modificar `schema.prisma` ni áreas protegidas sin justificar antes y verificar las reglas existentes del proyecto.

## 3. Revisión del asistente (08/09/2026) — de acuerdo con el enfoque general, con 3 puntos a resolver antes de Fase 1

El patrón local-first + validación periódica + gracia + modo restringido es correcto y probado para este tipo de producto. La separación explícita entre licencia comercial y `PeriodoOperativo` es acertada — consistente con los problemas de conflación de "período" que este proyecto ya tuvo que resolver varias veces (ver historial de `UX-PER-*` y bugs de `titularVigenteEn`).

Tres puntos concretos a resolver, en orden de importancia:

**a) Tensión entre persistencia del `installationId` (debe sobrevivir a un reinstall) y protección contra rollback de backup (§14).** Si el caché de licencia vive dentro de la base operativa para sobrevivir a un reinstall, automáticamente queda expuesto a que un restore de backup lo pise con una versión vieja — son la misma decisión de almacenamiento tirando en direcciones opuestas frente a dos eventos distintos. **Resolución propuesta:** guardar el caché de licencia en un lugar explícitamente fuera del alcance de lo que el mecanismo de backup respalda/restaura (archivo o tabla que el backup salte a propósito). Con eso, restaurar un backup viejo solo revierte datos operativos, nunca el estado de licencia — y el mecanismo de gracia offline ya diseñado para pérdida de conectividad resuelve el caso de rollback sin código especial: es, en la práctica, solo otra instancia de "estado local desactualizado", acotada por la detección de retroceso de reloj del punto 11 del doc original.

**b) Caso de borde de producto: cliente paga pero la instalación no llega a re-validar antes de que se cumpla la gracia local (7 días).** Puede pasar por conectividad rural intermitente o una instalación offline por vacaciones. Con el diseño actual, esa escuela quedaría suspendida a pesar de haber pagado, porque nunca llegó a sincronizar la extensión. No requiere ingeniería para resolverlo, pero sí una decisión de producto explícita: por ejemplo, un código de activación offline temporal generable desde el panel admin, o una alerta a soporte cuando una instalación no valida hace más de N días.

**c) Relación real entre `installationId` e `institutionId` — pendiente de confirmar contra el código.** El código de ALNEXT usa el patrón `withContext(req, async ({tenantId}) => ...)` scopeando literalmente cada query por `tenantId`/`institucionId`, lo cual sugiere (sin confirmar todavía) que el sistema fue diseñado con capacidad multi-tenant real, no necesariamente "una instalación = una institución siempre". El usuario no tiene la respuesta con certeza todavía. **Esto tiene que ser lo primero que se confirme en la Fase 1** (grepear el uso real de `tenantId` en el código, ver si `withContext` asume 1 institución por instalación o permite N) antes de decidir si `License` mapea 1 a 1 con una institución o si necesita cubrir varias por instalación.

## 4. Próximo paso (cuando termine el piloto)

Arrancar por la Fase 1 del plan original (análisis de arquitectura, sin tocar código), respondiendo primero el punto (c) de arriba, y dejando resuelto en el diseño el punto (a) antes de tocar el modelo de datos.