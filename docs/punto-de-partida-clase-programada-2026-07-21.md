# Informe de sesión — ClaseProgramada: validación de disparadores de generación (2026-07-21)

> Este documento es un **arranque de sesión** (continuación de `docs/punto-de-partida-clase-programada.md`, sesión 2026-07-20), no un plan de arquitectura. Registra qué se hizo, qué se encontró y en qué quedó bloqueada la sesión de hoy, para retomar mañana sin perder contexto. Las decisiones de fondo (invariantes, motores, precedencia de causas) siguen viviendo en `docs/Revisión de arquitectura de ClaseProgramada.md`.

---

## 1. Objetivo de hoy

Validar **end-to-end** los tres disparadores legítimos de generación de `ClaseProgramada`, identificados y acordados durante la conversación (coinciden con `docs/Revisión de arquitectura de ClaseProgramada.md`, sección 5, "Motor de Generación"):

1. **Activación de un `PeriodoOperativo`** (BORRADOR → ACTIVO).
2. **Creación de una nueva `DistribucionHoraria`** para una `Asignacion` que todavía no tenía, dentro de un `PeriodoOperativo` activo.
3. **Modificación de una `DistribucionHoraria`** existente dentro de un `PeriodoOperativo` activo.

Para cada uno había que verificar: que se generen las clases que corresponden, que no se dupliquen las existentes, y que las clases que dejan de corresponder se resuelvan correctamente. Sin modificar código si aparecían fallos — solo reportar.

Recién después de esto, la Fase 2 (no iniciada formalmente) era auditar el flujo de Incidencias para garantizar que una Incidencia nunca genera/crea `ClaseProgramada`, sino que actúa sobre las existentes.

---

## 2. Hallazgos arquitectónicos (confirmados por lectura de código, NO por ejecución)

Todo lo siguiente está confirmado leyendo el código fuente real, cruzado con `graphify` y con `docs/punto-de-partida-clase-programada.md` (sesión de ayer). **Nada de esto fue corrido contra una base de datos real hoy** — es análisis estático.

- **Disparador 1 — `lib/usecases/periodosOperativos/activarPeriodo.ts`**: busca `DistribucionHoraria` con `activo:true`, `estado:"ACTIVO"`, `deletedAt:null` y rango solapado con el nuevo período. Para cada una llama a `claseProgramadaService.generarParaRango`, que es idempotente (`skipDuplicates` + `@@unique(asignacionId+fecha+moduloId)` real en DB). Reporta aparte las distribuciones sin módulos. Confirmado implementado en el commit `3f8c354`.
- **Disparador 2 — `lib/usecases/distribuciones/crearDistribucion.ts`**: si hay período ACTIVO solapado, llama a `generarParaRango` inmediatamente al crear la distribución — pero como la distribución nueva todavía no tiene módulos asignados, esa llamada devuelve `creadas:0` (`generarParaRango` corta temprano si `modulos.length === 0`). La generación real para este caso ocurre recién cuando se llama a `asignarModulos` después. En la práctica, el disparador 2 "completo" (que efectivamente aparezcan clases) converge en el mismo código que el disparador 3.
- **Disparador 3 — `lib/usecases/distribuciones/asignarModulos.ts` / `nuevaVersionDistribucion.ts`**: ambos usan `claseProgramadaService.suspenderNoVigentes` (SUSPENDE causa `CAMBIO_DISTRIBUCION` las clases que dejan de corresponder, y **reactiva** las que habían sido suspendidas por esa misma causa y vuelven a corresponder — ej. lunes→martes→lunes) seguido de `generarParaRango` para las clases nuevas. `nuevaVersionDistribucion` usa como tramo `[hoy, fin de período]`; `asignarModulos` usa `[fecha_vigencia_desde de la distribución, fin de período]`.
- El helper puro `generarClases()` (`lib/helpers/clases.ts`) soporta modo "turno" (`comisionId` null, una clase por día, sin `moduloId`) y modo "escolar" (`comisionId` seteado, una clase por módulo por día correspondiente).
- **Los tres disparadores están, a nivel de código, correctamente implementados** según el comportamiento esperado. Esto es una conclusión de **lectura de código únicamente**, pendiente de prueba real.
- Dato aparte, ya documentado desde ayer y no tocado hoy: el Motor de Resolución (`lib/services/resolucionClaseService.ts` / `resolverClase()`) existe, compila, pero **no tiene ningún llamador en todo el proyecto** (confirmado vía `graphify explain`). Independiente de si los 3 disparadores de generación funcionan.

---

## 3. Flujo de Incidencias (análisis parcial, sin decisiones tomadas)

- La arquitectura acordada (sección 5 y 5.1 de `Revisión de arquitectura de ClaseProgramada.md`) es explícita: los disparadores del Motor de Generación son período/distribución/asignación — **Incidencia nunca aparece en esa lista**, y el punto 5.1 dice que Incidencia es un "modulador de estado", "nunca creador ni destructor de identidad" de `ClaseProgramada`.
- `lib/usecases/incidencias/crearIncidencia.ts` respeta esto en la creación: **exige** que ya existan `ClaseProgramada` en el rango pedido (`SinClasesProgramadasError` si no hay ninguna) — nunca genera. Pero tampoco vincula la incidencia recién creada a esas clases existentes dentro de esa misma función (no actualiza `incidenciaId` ni `estado`).
- Por grep, `lib/usecases/clases/actualizarClase.ts` (usecase de `PATCH /api/clases/[id]`) sí acepta `incidenciaId` como campo editable. Hay componentes de frontend (`ClasesAfectadasTable.tsx`, `PasoSeleccion.tsx`, `useClasesAfectadas.ts`) que sugieren que el vínculo Incidencia↔ClaseProgramada se hace manualmente desde un wizard, clase por clase, vía ese PATCH. **Esto es una inferencia, no trazada end-to-end** — pendiente de confirmar en la Fase 2.
- `lib/usecases/incidencias/generarClasesIncidencia.ts` solo se invoca desde `actualizarIncidencia.ts`, únicamente cuando se **extiende** `fecha_hasta` de una incidencia existente. Bypasea `claseProgramadaService` por completo: llama directo a `generarClases()` + `prisma.claseProgramada.createMany({ skipDuplicates: true })`, insertando filas con `incidenciaId` seteado.
- **Bug funcional concreto identificado (no corregido, solo diagnosticado)**: si el rango extendido ya tiene `ClaseProgramada` existentes (que, según la arquitectura, deberían existir porque el motor de generación ya las creó), `skipDuplicates` las salta silenciosamente — no inserta, pero tampoco actualiza `incidenciaId` ni `estado` de esas filas preexistentes. Resultado: extender una incidencia hacia un rango ya generado **no tiene ningún efecto visible**. Coincide con la sospecha planteada durante la sesión.
- **Pendiente, sin decidir ni implementar**: cuál es el comportamiento correcto de `generarClasesIncidencia.ts` (o su reemplazo) — probablemente debería buscar las `ClaseProgramada` existentes en el rango extendido, vincularlas (`incidenciaId`) e invocar el Motor de Resolución para fijar su estado/causa correctos, en vez de intentar crear filas. Conecta con la decisión pendiente de dónde enganchar `resolverClase` — explícitamente pospuesta hasta terminar la auditoría de Incidencias.

---

## 4. Cambios realizados (working tree, sin commits)

Tres archivos modificados, ninguno commiteado:

1. **`.env.test`**
   - Antes: `DATABASE_URL="postgresql://admin:admin123@localhost:5432/gestor_test?schema=public"`
   - Después: `DATABASE_URL="postgresql://admin:admin123@localhost:5433/gestor_test?schema=public"`
   - Motivo: el puerto 5432 (el que espera `docker-compose.yml`) no tenía nada escuchando y no hay acceso a `docker` desde esta shell de WSL. Se repuntó a una base nueva (`gestor_test`) creada en el Postgres que ya corría en 5433 — el mismo servidor que aloja `gestor_horarios` (DB de desarrollo real), pero como base separada e independiente. No toca `gestor_horarios`.

2. **`tests/helpers/auth.ts`**
   - Antes: `export const BASE_URL = "http://localhost:3000/api"`
   - Después: `export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000/api"`
   - Motivo: permitir apuntar tests HTTP a un puerto distinto sin romper el comportamiento default del resto de la suite. Cambio aditivo puro.

3. **`next.config.ts`**
   - Antes: config vacía (`{ /* config options here */ }`).
   - Después: agrega `...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {})`.
   - Motivo: intento de permitir un segundo `next dev` con `distDir` separado. **No resolvió el problema** (ver sección 7). Inocuo, condicional a una env var que nadie más setea — revertible sin impacto.

No se tocó `schema.prisma`, ninguna migración, ningún archivo de lógica de negocio. No se creó ningún archivo de test nuevo.

---

## 5. Infraestructura de test

- **Base de datos creada**: `gestor_test`, en el Postgres ya corriendo en `localhost:5433` (usuario `admin`), vía `CREATE DATABASE gestor_test OWNER admin;`. Separada de `gestor_horarios`.
- **Migraciones aplicadas**: `npx prisma migrate deploy` contra esa base, aplicó las 10 migraciones existentes (hasta `20260718195325_agrega_causa_y_version_resolucion`). No se generó ninguna migración nueva.
- **Servidor HTTP de test**: se intentó levantar un segundo `next dev` en el puerto 3100 con `NODE_ENV=test`. **No se logró** — ver sección 7. El servidor original del puerto 3000 (sin `NODE_ENV=test`, usando `gestor_horarios` real) nunca fue tocado y sigue corriendo tal cual estaba antes de la sesión.
- **Verificación de procesos**: la última vez chequeado (`ps aux | grep "next dev"`), solo aparecía el proceso original del puerto 3000. Los dos intentos en 3100 fallaron inmediatamente por el lock de Next, sin quedar corriendo en background. **No re-verificado** después de eso — el último comando de limpieza (`pkill` + `rm -rf .next-test`) fue rechazado antes de ejecutarse.
- **Directorio `.next-test/`**: pudo haber quedado parcialmente creado por el intento con `NEXT_DIST_DIR=.next-test`. No confirmado ni limpiado.

### Checklist para retomar mañana
1. `ps aux | grep "next dev"` — confirmar que solo sigue el proceso original del puerto 3000.
2. `ss -tlnp | grep 3100` — confirmar que no quedó nada colgado en 3100.
3. `ls -la .next-test` — si existe, se puede borrar sin riesgo (no llegó a usarse).
4. `git status` / `git diff` — confirmar que siguen ahí los 3 cambios de la sección 4, ninguno commiteado.
5. `psql -h localhost -p 5433 -U admin -d postgres -c "\l"` — confirmar que `gestor_test` sigue existiendo.

---

## 6. Pruebas end-to-end

**No se ejecutó ningún test end-to-end.** Ninguno de los tres disparadores fue efectivamente probado contra una base de datos real.

Motivo: la sesión se quedó en la fase de preparar la infraestructura (base de test lista y migrada, pero el mecanismo para exponer los usecases vía HTTP sin escribir en la base de desarrollo real quedó bloqueado por el lock de Next — sección 7). No se alcanzó a escribir el archivo de test.

**No debe interpretarse ninguna parte de este documento como "los tres disparadores funcionan end-to-end"** — lo único confirmado es el análisis estático de la sección 2.

---

## 7. Bloqueo encontrado — detalle técnico

Next.js (v16.1.6, Turbopack) usa en modo `next dev` un **lock file fijo** en `<raíz del proyecto>/.next/dev/lock` para impedir más de una instancia de `next dev` contra el mismo directorio de proyecto. Mecanismo interno, no configurable por CLI.

- **Cambiar el puerto no alcanza**: el conflicto es por directorio de proyecto, no por puerto.
- **`NEXT_DIST_DIR` (vía `distDir` en `next.config.ts`) tampoco resolvió el problema**: se relanzó el segundo servidor con `NEXT_DIST_DIR=.next-test`, apuntando a un build output separado. El error persistió idéntico, referenciando siempre la ruta fija `/home/lea/gestor_clean/.next/dev/lock` — el lock no depende de `distDir`.
- **Intentos realizados, en orden**:
  1. `NODE_ENV=test npx next dev -p 3100` → falla por lock.
  2. Override de `distDir` en `next.config.ts` + `NODE_ENV=test NEXT_DIST_DIR=.next-test npx next dev -p 3100` → mismo error de lock.
- Se descartó la vía de "segundo `next dev` contra el mismo repo" en favor de una estrategia alternativa (invocar usecases directamente) — quedó solo como idea conversacional, sin código escrito.

---

## 8. Estrategia propuesta para mañana

### Opción A — Worktree/clon temporal del proyecto
`git worktree add` (o clone aparte) da un checkout separado, con su propio `.next` (lock no colisiona). **Ventajas**: aislamiento total, permite seguir el patrón HTTP existente (`clases.test.ts`, `distribuciones.test.ts`). **Riesgos**: reinstalar `node_modules` (frágil con paquetes nativos como `bcrypt`/`@prisma/client`), mantener sincronizados ambos árboles. Complejidad: **media**.

### Opción B — `next build` + `next start` para el entorno de test
`next start -p 3100` no usa el lock de modo dev. **Ventajas**: no duplica el checkout. **Riesgos**: hay que confirmar que `next start` respeta `NODE_ENV=test` (Next suele forzar `NODE_ENV=production`, riesgo de que el server de test termine usando la DB real por error — hay que descartar esto explícitamente); requiere build completo por cada cambio de código. Complejidad: **media, con riesgo puntual serio a verificar antes de avanzar**.

### Opción C — Invocar los usecases directamente, sin servidor HTTP (recomendada)
Importar `activarPeriodo`, `crearDistribucion`, `asignarModulos`, `nuevaVersionDistribucion` directamente desde `lib/usecases/...` en el test, llamándolos como funciones TS normales dentro del proceso de Vitest. Como `npm run test` ya corre con `NODE_ENV=test`, y `lib/prisma.ts` ya carga `.env.test` en ese caso, el mismo Prisma Client de los usecases apunta automáticamente a `gestor_test` — sin ningún servidor Next corriendo. Solo hay que pasar `tenantId` directo en vez de resolverlo vía `withContext`/headers HTTP.

**Ventajas**: cero infraestructura adicional (la DB de test ya está lista); cero riesgo de interferir con el servidor de dev real; prueba exactamente la lógica de negocio que importa, sin ruido de la capa HTTP/auth (ya leída y entendida hoy). **Riesgos**: no ejercita la capa de rutas API (mapeo de errores a status HTTP, `withContext`) — pero es una capa delgada, ya revisada por lectura, y no es donde vive el riesgo real de este objetivo. Complejidad: **baja**.

**Recomendación: Opción C.** Menor infraestructura nueva, menor riesgo, prueba directamente lo que importa hoy. La Opción A queda como algo a considerar más adelante si se necesita validar también la capa HTTP/API completa — no indispensable para el objetivo actual.

---

## 9. Estado final

**Terminado:**
- Diagnóstico completo por lectura de código de los 3 disparadores de generación y del flujo de Incidencias (secciones 2 y 3).
- Base de datos de test (`gestor_test`, `localhost:5433`) creada, aislada de la DB de dev real, con las 10 migraciones aplicadas.
- Ajustes menores de soporte para testear (`TEST_BASE_URL` opcional en `tests/helpers/auth.ts`, `distDir` opcional en `next.config.ts` — sin uso real, revertible sin impacto).

**Pendiente:**
- Escribir y ejecutar el test end-to-end de los 3 disparadores (ningún archivo de test creado todavía).
- Verificar/limpiar el entorno antes de retomar (checklist sección 5).
- Profundizar la auditoría de Incidencias: confirmar cómo se vincula hoy una Incidencia recién creada con las `ClaseProgramada` existentes (inferido, no trazado end-to-end).
- Decidir qué debe hacer `generarClasesIncidencia.ts` en el caso de extensión de fecha — no decidido, no implementado.
- Decidir el punto de enganche del Motor de Resolución (`resolverClase`) — pospuesto.

**Primer paso concreto para mañana:** aplicar la Opción C — escribir `tests/generacion-clases.test.ts` importando los usecases directamente y corriéndolo contra `gestor_test` vía `npm run test`, cubriendo los tres disparadores definidos en la sección 1.
