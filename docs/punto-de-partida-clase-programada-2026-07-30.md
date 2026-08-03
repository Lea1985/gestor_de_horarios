# Punto de partida — Session 30-07-2026

Continuación de `punto-de-partida-clase-programada-2026-07-25.md`. Esta sesión tenía como objetivo original avanzar sobre el Dashboard, pero se desvió casi por completo hacia una auditoría de entorno (para un futuro plan de instalación en otra máquina) y hacia arreglar datos rotos de Escuela N°12. El plan del Dashboard quedó diseñado pero sin ejecutar — es lo primero para retomar mañana.

---

## Hilo 1 — Plan de validación del Dashboard (diseñado, sin ejecutar)

A partir de un borrador de tarea traído por el usuario, se revisó críticamente y se dejó un plan recortado en dos entregas:

- **Entrega A (Fases 1-5):** solo lectura. Inventario de métricas de `app/protected/dashboard/page.tsx` y sus hijos, fuente de verdad por métrica (SQL crudo para conteos simples, cálculo manual para agregaciones complejas), dataset controlado, valores esperados, comparación DB/API/UI.
- **Entrega B (Fases 6-8, condicional):** escenarios de transición y aislamiento multi-tenant, solo si la Entrega A justifica el costo.

**Bloqueantes que se fueron resolviendo durante la sesión** (originalmente listados aparte, ya incorporados):
- Commitear el reporte de módulos computables antes de arrancar — sigue pendiente, no se hizo esta sesión.
- Aislamiento de datos para Fase 6 — resuelto en el diseño (test file con limpieza, no mutación suelta).
- Tenant B para Fase 7 — resuelto: primero se pensó Sanatorio del Sur (ya en el seed base), después se sumó también Colegio Ceferino como tenant liviano (ver Hilo 3).
- Método de medición del Nivel 3 (UI) — sigue sin decidir (manual vs. Claude in Chrome).

**Estado: la Fase 1 (inventario de métricas) nunca arrancó.** Es lo primero de mañana.

---

## Hilo 2 — Auditoría de entorno para plan de instalación en otra máquina (prácticamente cerrado)

Quedó documentado en detalle en `docs/ Verdades del entorno — ALNEXT.md` (archivo local, no versionado en git — decisión explícita de dejarlo así). Resumen de lo cerrado hoy:

- **Postgres:** confirmado nativo (apt, Postgres 18, systemd), un solo cluster, puerto **5433**. Se descartó la creencia previa de que "el motor de Docker Desktop respondía" — era la instancia nativa.
- **`docker-compose.yml`:** confirmado muerto (cero referencias reales) — borrado.
- **`bcrypt` (nativo) vs `bcryptjs`:** el código real ya usaba `bcryptjs` en login/alta de usuario; `prisma/seed.ts` y dos archivos de test usaban `bcrypt` sin necesidad. Se unificó todo a `bcryptjs` y se sacó la dependencia nativa (`npm uninstall bcrypt @types/bcrypt`) — la máquina nueva ya no va a necesitar build tools.
- **`package.json` → `test:run`:** tenía el puerto viejo (5432, roto). Se corrigió a 5433, alineado con lo que ya se hacía a mano desde el 21/07 según un doc previo que nunca se volvió a reflejar en el script.
- **`tests/tsconfig.json`:** se agregó (con `"exclude": []` explícito, para no heredar el `exclude: ["tests"]` del tsconfig raíz y auto-excluirse) — resuelve un error de tipos de Node en el editor para archivos bajo `tests/`, sin afectar la ejecución real de los tests.
- **`DOTENV_KEY` y `BOOK_LANG`:** confirmados como ruido de tipos de `node_modules` (no código propio) — cerrado sin acción.
- **`prisma/triggers.sql`:** resabio del traspaso de PC vieja → nueva, cero triggers activos en la base real (verificado con `information_schema.triggers`) — borrado.
- **`backup_antes_migracion.sql` y `gestor_horarios_backup.sql`:** distinto origen entre sí (headers de `pg_dump` distintos — uno es Postgres 18/Ubuntu actual, tomado justo antes de la migración `20260705121334_add_incidencia_id_reemplazo`; el otro es Postgres 15/Debian, del setup viejo con Docker). Ambos quedaron atrás de 4+ migraciones posteriores — sin valor de rollback real hoy. Borrados.
- **`.env` / `.env.test`:** confirmado que están correctamente en `.gitignore` (`.env*`).
- Suite completa verificada de punta a punta después de todos los cambios: **369/371 en verde**, 2 skips ambientales (Docker CLI).
- Quedó documentado un cheat-sheet operativo: cómo levantar el servidor de test (`nohup npm run dev:test & disown` + polling con `curl`) y cómo cerrarlo (`ss -tlnp | grep :3000` + `kill`), y el gotcha de `psql` con el `?schema=public` de las connection strings de Prisma.

**Único punto abierto de este hilo:** el seed real de Codigario + Colegio Ceferino (el de onboarding real del cliente) sigue deliberadamente en espera, al final de la cola — no se tocó.

---

## Hilo 3 — Escuela N°12 rota + Colegio Ceferino liviano + dataset para el Dashboard

**Diagnóstico:** las `ClaseProgramada` de Escuela N°12 quedaron mal después de aplicar incidencias — hipótesis (no confirmada al 100%, pero consistente con toda la evidencia del día) es que se cargaron sin pasar por el flujo completo (`PeriodoOperativo` en `BORRADOR` → distribución de módulos → activar), que es lo que dispara la generación correcta de clases.

**Acciones tomadas hoy, en orden:**

1. **`seed.ts` actualizado** para agregar Colegio Ceferino como tenant liviano (solo estructura: institución + admin `secretaria3164@colegioceferino.edu.ar`, mismo patrón que Escuela 12 y Sanatorio del Sur) — decidido explícitamente que esto **no** es el seed real de onboarding, que sigue aparte y en espera. Corrido con éxito (`npx prisma db seed`) — confirmado por query: 3 instituciones (Escuela N°12, Sanatorio del Sur, Colegio Ceferino).
2. **TRUNCATE selectivo** sobre `gestor_horarios`, preservando `Codigario`/`CodigarioItem` (se confirmó después: 3 codigarios, 109 items intactos) — se vaciaron las tablas operativas rotas de Escuela 12 (agentes, asignaciones, clases, distribuciones, período operativo, etc.).
3. **`prisma/seed-validacion-dashboard.ts` creado** — script determinista que usa los usecases reales (`crearDistribucion`, `asignarModulos`, `activarPeriodo`, `crearIncidencia`, `crearReemplazo`, no escritura directa de `ClaseProgramada`) para poblar Escuela N°12 con:
   - 2 docentes titulares (Ana Gómez — lunes, Luis Pérez — miércoles) + 1 suplente (Marta Suárez).
   - Período operativo julio-agosto 2026, activado (genera las clases).
   - 1 incidencia sobre Ana Gómez (01/08-15/08) que afecta 2 lunes (03/08 y 10/08).
   - 1 reemplazo sobre la clase del 03/08 (queda `REEMPLAZADA`); la del 10/08 queda `SUSPENDIDA` sin cobertura.
   - Al final imprime una tabla de conteo real por estado/causa — es el punto de partida de la Fase 4 (valores esperados) del plan del Dashboard.

   **Pendiente de confirmar mañana:** el usuario iba a correrlo recién ahora (`node --loader ts-node/esm prisma/seed-validacion-dashboard.ts`) — falta ver el resultado real y confirmar que generó lo esperado.

### Hallazgos importantes descubiertos durante este hilo (para el plan del Dashboard)

1. **El estado `DICTADA` existe en el enum pero es inalcanzable.** Ningún usecase ni endpoint transiciona una clase a `DICTADA` — `PATCH /api/clases/[id]` explícitamente rechaza setear `estado`. No es un bug de este dataset, es un estado real del código actual.
2. **`lib/reporting/transformers/calcularResumenEstados.ts` no tiene ningún llamador en todo el repo** (confirmado por grep) — es código sin usar. Cualquier arreglo ahí no cambia nada de lo que el Dashboard muestra hoy.
3. **Falta identificar dónde (si en algún lado) el Dashboard calcula hoy la cuenta de "dictadas"** — quedó pendiente revisar `app/api/dashboard/overview/route.ts` (el endpoint más probable) antes de decidir si hay algo roto ahí o si esa métrica simplemente no existe todavía en el Dashboard real.
4. **Propuesta de regla discutida (no implementada):** contar como "dictada" toda clase `PROGRAMADA` cuya `fecha <= hoy` (sin suspensión ni reemplazo), calculado al leer, en vez de escribir un estado real en la base. Se prefirió esta opción sobre escribir `DICTADA` de verdad vía un job programado, porque hoy **no existe ninguna infraestructura de jobs/cron en el proyecto** — armar eso es un costo real, no algo chico. Queda como decisión pendiente, a tomar recién después de encontrar el punto 3.

---

## Pendiente unificado para mañana

1. **Confirmar el resultado de `seed-validacion-dashboard.ts`** — verificar la tabla de conteo que imprime, contra lo esperado (2 docentes, 1 incidencia con 2 clases afectadas, 1 reemplazo).
2. **Encontrar dónde el Dashboard calcula (si lo hace) la cuenta de estados de clases** — empezar por `app/api/dashboard/overview/route.ts`. Recién ahí decidir qué hacer con el hallazgo de `DICTADA`/`calcularResumenEstados.ts`.
3. **Arrancar la Fase 1 del plan del Dashboard** (inventario de métricas de `dashboard/page.tsx` y sus hijos) — no se tocó en toda la sesión de hoy.
4. Seed real de Codigario + Colegio Ceferino: sigue en espera, al final de la cola.
5. Commitear todo lo de hoy: cambios en `seed.ts`, borrado de `docker-compose.yml`/`triggers.sql`/los dos backups `.sql`, fix de `bcrypt`→`bcryptjs`, fix de puerto en `test:run`, `tests/tsconfig.json` nuevo, y el script `seed-validacion-dashboard.ts`. Nada de esto se commiteó todavía durante la sesión.
6. Método de medición del Nivel 3 (UI) del plan del Dashboard — sigue sin decidir.

## Estado general al cierre del 29/07

El entorno quedó auditado y prolijo — Postgres nativo confirmado, toda la config contradictoria (puertos, `docker-compose.yml`, dependencias nativas innecesarias, resabios de backups viejos) resuelta con evidencia, no por conjetura, y la suite corriendo 369/371 en verde. Escuela N°12 se resetea preservando los Codigario cargados a mano, y se suma Colegio Ceferino como tenant liviano para pruebas de aislamiento — separado a propósito del seed real de onboarding, que sigue en espera. Se armó un script determinista que usa los usecases reales para generar un dataset con docentes, incidencia y reemplazo, pensado como la base de la Fase 3 del plan del Dashboard. En el camino aparecieron dos hallazgos reales para ese plan (estado `DICTADA` inalcanzable, y una función de reporte sin ningún llamador) que quedan para investigar mañana antes de decidir si ameritan un cambio de código. La Fase 1 del plan del Dashboard, que era el objetivo original de la sesión, todavía no arrancó.