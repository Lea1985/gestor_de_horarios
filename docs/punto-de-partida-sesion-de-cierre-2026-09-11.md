# ALNEXT — Punto de partida / cierre de sesión 11/09/2026

## Resumen del día

Continuación directa de la sesión del 10/09: se cerró por completo el bloque de backup/restauración (incluyendo el diagnóstico del bug de Task Scheduler que había quedado abierto), se prolijó el repo (dos problemas de git arrastrados), se reescribió el plan de instalación apuntando a Windows nativo, y se diseñó y validó el mecanismo de seed real por escuela — la pieza que faltaba para que el instalador pueda cargar los datos reales de cualquier escuela nueva, no solo datos de prueba.

## Hecho hoy

1. **Diagnosticado el bloqueador de Task Scheduler dejado abierto ayer.** El log de `Microsoft-Windows-TaskScheduler/Operational` confirmó que la tarea SÍ ejecutaba `powershell.exe` de verdad (PID real, código de salida 0) — no era un falso éxito. El fallo del 10/09 fue puntual y no se repitió: hoy, con el día de por medio, tres disparos independientes (uno automático al iniciar sesión, dos manuales) generaron el backup correctamente. Mecanismo de backup automático confirmado funcional de punta a punta. Tarea de prueba (`ALNEXT-Backup-TEST`) eliminada de la máquina de desarrollo.
2. **Repo prolijado, dos problemas de arrastre resueltos:**
   - `docs/punto-de-partida-session de cierre-2026-08-26.md` estaba trackeado en git como archivo vacío (0 bytes) desde aquella sesión — se completó con el contenido real y se commiteó aparte (`4ca3e6a`).
   - Un documento (`plan-pre-post-piloto-alnext.md`) se había guardado mal en el repo: el título contenía una `/` que Linux interpretó como separador de carpeta, generando un directorio con nombre roto (`docs/ALNEXT — Plan pre-piloto /`). Renombrado a `docs/plan-pre-post-piloto-alnext-2026-09-10.md`.
3. **`scripts/backup-alnext.ps1` y `scripts/restaurar-alnext.ps1` commiteados al repo real** (`9e68d01`), después de haber sido diseñados y probados el 10/09 en una carpeta de prueba de Windows separada (por la razón estructural de que el repo de desarrollo vive en WSL2 y estos scripts son de Windows puro).
4. **`.gitignore` actualizado** — `backups/` (los `.sql` con datos reales) nunca se versiona (`8e0c7f5`).
5. **`docs/plan-pre-post-piloto-alnext-2026-09-10.md` actualizado** (`086e9bb`): los puntos 4, 5 y 6 (backup automático, manual, restauración) marcados como hechos, con nota de contexto sobre el pivote de arquitectura.
6. **`docs/ Verdades del entorno — ALNEXT.md` reescrito** en su sección de plan de instalación (`17eb12c`): pasa de un esqueleto basado en WSL2 a uno basado en Windows nativo, con los comandos reales de `Register-ScheduledTask` ya validados, referencias a los scripts de backup/restauración, y una recomendación de puerto (5432 en la máquina de la escuela, distinto del 5433 usado en dev para convivir con WSL2).
7. **Aclarado el origen y alcance de la tarea #11.** Investigando el historial del repo se confirmó que "Colegio Ceferino" no es data de prueba genérica: es una institución real, y el usuario confirmó en esta sesión que **es la primera escuela piloto**. Lo que existe hoy en `prisma/seed.ts` es solo un tenant liviano exploratorio (creado el 30/07 para probar aislamiento multi-tenant), no el proceso real de onboarding — se decidió explícitamente separar ambas cosas. Sin urgencia: la carga de los datos reales de Ceferino (incluyendo los 109 porcentajes de codigario) se hace más adelante, cuando se acerque la fecha real de instalación.
8. **Diseñado y construido el mecanismo de seed real por escuela**, la pieza que le faltaba al instalador:
   - `scripts/seed-instalacion.ts` — script independiente de `prisma/seed.ts` (que sigue siendo solo el fixture de desarrollo, sin tocar). Lee un archivo de configuración, crea una única institución real + un admin inicial + el rol ADMIN asignado, de forma idempotente.
   - `config/institucion.example.json` — plantilla commiteada, sin datos reales.
   - `config/institucion.json` — el archivo real de cada instalación (datos + contraseña), agregado a `.gitignore`, nunca se versiona.
   - Commiteado (`242df2d`) y **probado en vivo contra `gestor_test`** con datos de prueba genéricos (no los de Ceferino): institución, admin y rol creados correctamente. Datos de prueba limpiados después de validar.
   - De paso, se encontró (sin corregir, no bloquea nada) un bug menor preexistente en `prisma/seed.ts`: el `upsert` de Ceferino busca por un CUIT y crea con otro distinto, por lo que nunca actualiza correctamente en re-ejecuciones. Queda anotado para cuando se retome ese archivo.

## Decisión de cierre de sesión

Se evaluó seguir directamente con el **instalador único** (el script que encadene Postgres, Node, clonar el repo, `npm install`, migraciones, el seed y el registro de Task Scheduler en un solo flujo ejecutable) pero se decidió **parar acá por hoy**, a pedido explícito de evaluación honesta: es la pieza más compleja y de mayor riesgo del bloque completo (corre en una máquina de escuela, sin supervisión paso a paso como hoy), y la sesión ya fue larga y con varios ciclos de debugging (Task Scheduler, quoting de PowerShell, nombres de archivo rotos). Mejor abordarlo en una sesión nueva, con foco completo. No hay fecha límite que lo urja — no hay período de instalación en Ceferino todavía fijado.

## Pendiente (orden sugerido al retomar)

1. **Construir el instalador único** (`.ps1` que encadene todos los pasos ya validados por separado: Postgres nativo, Node, clonar repo, `npm install`, `prisma migrate deploy`, `seed-instalacion.ts` con `config/institucion.json`, y registro de Task Scheduler para backup automático).
2. Cargar los datos reales de Colegio Ceferino (institución real + admin real + los 109 porcentajes de codigario) vía el mecanismo ya construido — sin apuro, cuando se acerque la instalación real (tarea #11, actualizada).
3. Corregir el bug menor del `upsert` de Ceferino en `prisma/seed.ts` (CUIT del `where` no coincide con el del `create`) — bajo impacto, es el seed exploratorio de dev.
4. Decidir sobre los dos `.sql` sueltos en la raíz del repo (`backup_antes_migracion.sql`, `gestor_horarios_backup.sql`).
5. Cosmético, sin apuro: renombrar `docs/ Verdades del entorno — ALNEXT.md` (espacio y guion largo al inicio del nombre).
6. Instrumentación mínima del piloto (logging/analytics básico) — todavía sin arrancar.
7. Prueba final (instalación limpia + restauración + datos realistas + recorrido completo) — depende de tener el instalador único armado.
8. Hallazgos Fase 10 restantes, todos ya clasificados en el plan pre/post-piloto: UX-ADM-001/002/003 (post-piloto), UX-ADM-004 (resuelto vía seed, sin tarea de código), UX-ADM-008/009/010/011/012/013 (sin urgencia).
9. Backlog no tocado en estas dos sesiones: #167-173 (45 tests desactualizados), #189 (UX-DSH-007), #191, #204 (post-piloto, licencias MVP).

## Estado del repo al cierre

Todo commiteado y pusheado a `develop`. Últimos commits relevantes: `9e68d01` (scripts backup/restauración), `4ca3e6a` (doc 26/08 completado), `853dc8f` (plan pre-piloto + cierre 09/09-10/09), `8e0c7f5` (.gitignore backups/), `086e9bb` (plan actualizado con backup/restauración hechos), `17eb12c` (plan de instalación reescrito para Windows nativo), `242df2d` (seed real por escuela). Sin cambios sin commitear, sin ramas sueltas.
