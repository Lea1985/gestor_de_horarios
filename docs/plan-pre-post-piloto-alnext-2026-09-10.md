# ALNEXT — Plan pre-piloto / post-piloto (registrado 10/09/2026)

**Origen:** propuesta del usuario tras la auditoría UX Fase 10 (Institución, agentes y acceso, `docs/auditoria-ux-institucion-agentes-acceso-2026-09-09.md`). Revisado técnicamente y con 2 puntos ajustados antes de registrarlo.

## Contexto clave que condiciona todo el plan

El piloto es una **instalación local de un solo tenant** (una escuela, usuarios conocidos, roles cargados por seed, acceso controlado directamente por el usuario). Esto es distinto del entorno de dev/test donde se corrió la auditoría de Fase 10, que tiene **3 instituciones reales en la misma base** (Escuela N°12, Sanatorio del Sur, Colegio Ceferino). Varios hallazgos de esa auditoría (UX-ADM-001, 002, 003, 009) pierden severidad real en un tenant único — no porque el código se haya corregido, sino porque la topología del piloto reduce la superficie de esos problemas. Esta es la razón de fondo para diferirlos, no solo "no hace falta un sistema de roles todavía" — importante dejarlo explícito para cuando se retome esto con multi-tenant real.

## 🟢 Antes del piloto

1. **Cerrar auditoría UX Fase 10** — prácticamente cerrada; solo falta triage/clasificación de cada hallazgo contra este plan (ver tabla más abajo), no auditoría nueva.
2. **Seguridad mínima del piloto** (higiene básica, no negociable, no es "roles avanzados"):
   - ~~Confirmar si las contraseñas ya están hasheadas~~ — **CONFIRMADO 10/09/2026: ya lo están.** `POST /api/usuarios` hace `bcrypt.hash(password, 10)` antes de guardar (`app/api/usuarios/route.ts`), `iniciarSesion` compara con `bcrypt.compare(password, usuario.passwordHash)` (`lib/usecases/auth/iniciarSesion.ts`), y el `GET` excluye `passwordHash` explícitamente de la respuesta. Sin acción pendiente.
   - HTTPS si aplica al modo de instalación.
   - Backups no accesibles públicamente.
3. **Reseteo de contraseña — versión mínima**: sin recuperación self-service (instalación local, sin email), un script/comando del usuario para resetear la contraseña de un usuario a mano. Depende del punto 2 (el script tiene que generar el hash con el mismo algoritmo que usa el login, si ya hashea). No hace falta UI. Documentado como decisión consciente.
   - Ajuste: el link muerto "¿Olvidaste tu contraseña?" en el login (UX-ADM-007) se puede sacar o reemplazar por un texto de contacto **ahora mismo**, sin esperar al script — es un cambio trivial.
4. ~~**Backup automático.**~~ — **HECHO (11/09/2026):** `scripts/backup-alnext.ps1` + tarea de Windows Task Scheduler con dos triggers (al iniciar sesión + cada 4 horas), `-StartWhenAvailable` para cubrir el caso de máquina apagada. Validado con 3 disparos reales e independientes generando el backup correctamente.
5. ~~**Backup manual / bajo demanda.**~~ — **HECHO:** mismo script (`backup-alnext.ps1`), corrido a mano cuando haga falta. No requirió UI ni script separado, como estaba previsto.
6. ~~**Restauración**~~ — **HECHO:** `scripts/restaurar-alnext.ps1`, destructivo con confirmación explícita (escribir el nombre de la base). Ciclo completo probado de punta a punta: crear dato → backup → borrar todo → restaurar → confirmar que el dato volvió intacto.
7. **Instalador** — ~5 minutos, configuración mínima, seed inicial.
   - Ajuste: el seed inicial puede cargar directamente los datos de "Mi institución" (UX-ADM-004: domicilio, teléfono, CUIT usados en headers de PDF) — no hace falta construir una pantalla para esto en un tenant único configurado una sola vez por el usuario.
8. **Instrumentación mínima del piloto** — logging/analytics básico (eventos de uso, tiempos por tarea, errores) antes de instalar en la escuela.
9. **Criterios de éxito del piloto** — definidos 10/09/2026, ver sección dedicada más abajo.
10. **Ajuste agregado: UX-ADM-006 (errores 401 no distinguidos)** — no es un tema de permisos ni de seguridad, es usabilidad del día a día: si a un usuario se le vence la sesión durante el uso real, hoy ve "Error cargando agentes" sin entender que tiene que volver a loguearse. Afecta directamente lo que el piloto va a medir (punto 11), por eso se suma acá en vez de post-piloto.
11. **Ajuste agregado: UX-ADM-005 (texto de modal engañoso)** — costo casi nulo, se puede resolver junto con el punto 1 sin esperar a nada.
12. **Prueba final** — instalación limpia + restauración + datos realistas + recorrido completo.
13. **Piloto** — instalar en la escuela, observar uso real. Objetivo: descubrir qué usan, qué no, dónde se traban, cuánto ahorran, qué falta, y si el problema que resuelve ALNEXT tiene valor suficiente como para pagar por él.

## 🔵 Después del piloto

1. **Roles y permisos** — diseño formal usuario → institución → rol → permisos → operación. Cubre UX-ADM-001 (escalación de privilegios) y UX-ADM-002 (sesión no se invalida al quitar rol) de forma definitiva, ya con multi-tenant real en juego.
2. **Gestión de usuarios** — alta, baja, reactivación, asignación de roles (pantalla, hoy inexistente).
3. **Sesiones** — revocación, expiración, invalidación, logout forzado.
4. **Recuperación de contraseña self-service** — cuando haya usuarios reales fuera del control directo del usuario, y probablemente ya no instalación puramente local.
5. **Multiinstitución avanzado** — selector/contexto institucional (UX-ADM-009).
6. **Endurecimiento del SaaS** — cuando se pase de instalación piloto a producto multi-institución. Incluye reconsiderar UX-ADM-003 (endpoint público de instituciones) y UX-ADM-013 (rutas `/protected/*` sin protección server-side) con multi-tenant real.

## Criterios de éxito del piloto (definidos 10/09/2026)

**Contexto real, no asumido:** la escuela no viene de papel/Excel — tiene un sistema propio ("un gran CRUD"), con muchos errores, que "empezó a hacer agua", y con una lógica de negocio distinta a la de ALNEXT. Esto cambia el eje de la evaluación: no se trata tanto de medir "cuánto tiempo ahorra" sino de confirmar si ALNEXT **funciona de verdad y es confiable** donde el sistema actual no lo es. El único usuario real del piloto es **el secretario** — no hay múltiples roles a coordinar, lo cual simplifica bastante la evaluación.

**Ventana de medición:** desde la fecha de implementación real hasta el **31/12/2026** (entre ~30 y ~90+ días según cuándo arranque exactamente).

**Objetivo del piloto:** confirmar si ALNEXT resuelve, mejor que el sistema actual, el registro de ausencias/reemplazos y la generación de reportes de horas trabajadas confiables, en el uso real diario del secretario.

**Éxito (señales positivas):**
- El secretario carga ausencias/reemplazos en ALNEXT como parte de su rutina normal, sin necesidad de recordatorio constante.
- El reporte de horas trabajadas (jornadas / módulos computables) refleja lo que realmente pasó — cotejado de tanto en tanto contra lo que el secretario sabe que ocurrió — sin necesitar corrección manual sistemática.
- Deja de depender del sistema viejo (o de anotaciones paralelas) para estas dos tareas puntuales.
- Al cierre del piloto, el secretario elegiría seguir usando ALNEXT antes que volver al sistema viejo, aunque fuera gratis (señal de valor percibido, independiente del precio).

**Fracaso (criterio explícito del usuario, el más accionable de los dos):**
- No se puede cargar fácilmente una ausencia/reemplazo.
- El reporte de horas trabajadas no es real / no se puede confiar en él.

**Referencia de precio:** el usuario pagaría **$75.000/mes** por una versión que cumpla estos criterios — cifra de referencia propia, no validada todavía con el cliente piloto; sirve como ancla para decidir, post-piloto, si el valor percibido justifica ese número.

**Nota de contexto para el que retome esto:** los dos flujos que definen éxito/fracaso (ausencias/reemplazos, y reportes de horas trabajadas) ya pasaron por un ciclo completo de auditoría UX y corrección en las sesiones previas a este plan — Incidencias (UX-INC-*), Reemplazos (UX-REE-*) y Reportes (UX-REP-*, especialmente `jornadas` y `modulos-computables`, que son justamente los reportes de horas trabajadas). Esto no garantiza el resultado del piloto, pero reduce el riesgo de que el piloto fracase por bugs ya conocidos y corregidos.

## Mapeo de los 13 hallazgos de la Fase 10 contra este plan

| Hallazgo | Bucket | Nota |
|---|---|---|
| UX-ADM-001 (P0) | 🔵 Después — Roles y permisos | Severidad real baja en tenant único sin usuarios hostiles |
| UX-ADM-002 (P0) | 🔵 Después — Sesiones | Ídem |
| UX-ADM-003 (P1) | 🔵 Después — Endurecimiento SaaS | En tenant único devuelve solo los datos de esa misma escuela |
| UX-ADM-004 (P1) | 🟢 Antes — resuelto vía seed del instalador | No necesita pantalla propia |
| UX-ADM-005 (P1) | 🟢 Antes — fix trivial de texto | Sin dependencias |
| UX-ADM-006 (P1) | 🟢 Antes — agregado por impacto en usabilidad del piloto | No es tema de permisos |
| UX-ADM-007 (P1) | 🟢 Antes — script de reseteo + sacar link muerto | Depende de confirmar hasheo (punto 2) |
| UX-ADM-008 (P2) | Sin urgencia, cualquier momento | Cosmético |
| UX-ADM-009 (P2, no confirmado) | 🔵 Después — Multiinstitución avanzado | |
| UX-ADM-010 (P2) | Sin urgencia, cualquier momento | Validación menor |
| UX-ADM-011 (P3) | Sin urgencia, cualquier momento | Validación menor |
| UX-ADM-012 (P3) | Sin urgencia, cualquier momento | Consistencia menor |
| UX-ADM-013 (P2) | 🔵 Después — Endurecimiento SaaS | Bajo riesgo con tenant único controlado |

## Progreso (actualizado 11/09/2026)

- ~~Verificar hasheo de contraseñas~~ — **CONFIRMADO:** ya usa bcrypt en creación y login. Sin acción pendiente.
- ~~Script de reseteo manual de contraseña~~ — **HECHO:** `scripts/resetear-password.ts`, probado en vivo, commit `6427cfb`.
- ~~UX-ADM-007 (link muerto "¿Olvidaste tu contraseña?")~~ — **HECHO**, mismo commit.
- ~~UX-ADM-005 (texto engañoso del modal de eliminar agente)~~ — **HECHO**, mismo commit.
- ~~UX-ADM-006 (401 no distinguido)~~ — **HECHO:** interceptor global en `useAuth.ts` + mensaje en login, commit `7df00dd`.
- ~~Criterios de éxito del piloto~~ — **DEFINIDOS**, ver sección dedicada arriba.
- ~~Backup automático~~ — **HECHO (11/09/2026)**, ver punto 4.
- ~~Backup manual~~ — **HECHO**, ver punto 5.
- ~~Restauración~~ — **HECHO**, ver punto 6.

## Próximo paso inmediato

Con el bloque completo de backup/restauración validado (automático + manual + restauración, puntos 4-6), lo único que falta del bloque "antes del piloto — código" es el **punto 7, Instalador**. Concretamente: reescribir el "plan de instalación en máquina nueva" — hoy documentado para WSL2 en `docs/ Verdades del entorno — ALNEXT.md` — apuntando a **Windows nativo** (decisión tomada el 10/09, ver más abajo), reutilizando exactamente los comandos de `Register-ScheduledTask` ya probados en vivo el 11/09 para hornear los triggers de backup dentro del instalador.

## Nota: pivote de arquitectura de instalación (10-11/09/2026)

El destino de instalación del piloto pasa de **WSL2+Ubuntu** (documentado originalmente en `docs/ Verdades del entorno — ALNEXT.md`) a **Windows nativo**. Motivos: (1) las máquinas de las escuelas se apagan al finalizar la jornada, lo que vuelve poco confiable un cron/scheduler basado en WSL2; (2) el proyecto ya no depende de ningún build nativo (`bcrypt` → `bcryptjs`), así que Postgres + Node + Next.js corren en Windows puro sin herramientas de compilación. Validado en la práctica: Postgres 18 nativo instalado y funcionando en una máquina Windows, con backup automático (Task Scheduler), backup manual y restauración probados de punta a punta.
