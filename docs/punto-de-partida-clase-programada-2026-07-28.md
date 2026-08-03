# Punto de partida — ClaseProgramada

Documento único que consolida el cierre del 2026-07-27 y la planificación del 2026-07-28. Continuación de `punto-de-partida-clase-programada-2026-07-25.md`.

---

## Sesión 2026-07-27 (cierre)

Esta sesión cerró: la limpieza de código muerto pendiente, la primera corrida real de la suite completa contra un servidor vivo, y los 4 focos que esa corrida destapó (agentes, horario, codigarios, distribuciones, clases). Estado final: 350/352 tests pasando -- los 2 que fallaban eran ambientales (CLI de Docker no encontrado en esta distro WSL) y ya se resolvieron más tarde el mismo día (ver abajo).

### Confirmado y cerrado esta sesión

**Limpieza de código muerto (tarea #12):**
- Removidas `generarParaDistribucion`, `eliminarFuturas`, `suspenderFuturas` de `claseProgramadaRepository.ts` (y el tipo `ClaseACrear`).
- Removidas `detectarReemplazosParaMigrar`, `migrarReemplazosAIncidencias` de `reemplazoRepository.ts`.
- Sacadas las escrituras redundantes de `estado` en `reemplazoRepository.crear()`/`.eliminar()` -- en `.eliminar()` podían dejar una combinación estado/causa inconsistente (`estado: PROGRAMADA` + `causa: INCIDENCIA`), aunque `resolverClase` lo corregía enseguida.

**Primera corrida real de la suite completa (con servidor vivo):**
- Diagnosticado y resuelto: el server de `dev:test` no estaba levantado (`ECONNREFUSED`) -- causa real de la corrida masiva fallida, nada que ver con el código. Fix de rutina: `nohup ... & disown` + polling de `curl` antes de correr vitest.
- `tests/agentes.test.ts` -- 6 fallos por un supuesto incorrecto del test (esperaba `data.agente.{id,documento}` envuelto; la API siempre devolvió el registro plano, confirmado contra `obtenerAgente.ts`/`crearAgente.ts`). Corregido en el test.
- `lib/repositories/horarioRepository.ts` -- bug real de producción: el `include` compartido seleccionaba `asignacion.agente` (relación removida, vive en `TitularAsignacion`) y `reemplazos.asignacionSuplente` (nombre de campo incorrecto, el real es `agenteSuplente`). `GET /api/horario` y `/api/horario/institucion` tiraban 500 en el 100% de los llamados. Corregido. Impacto real: cero -- se confirmó por grep que ningún archivo del frontend llama a esos endpoints.
- `codigarios.test.ts` -- dos causas distintas:
  - `eliminarItem.ts` tiraba una excepción para item inexistente en vez de devolver `{ok:true, deleted:false}` (convención idempotente usada en el resto de la app), y la ruta DELETE no la atrapaba -- 500. Corregido.
  - `crearItem`/`codigarioRepository.crearItem` -- el duplicado se detecta a nivel de aplicación (no por constraint de DB), tira un error propio, pero el `instanceof` en la ruta no lo reconocía por una duplicación de módulo entre bundles de Next en dev (clásico: clases definidas en un repository y re-exportadas cruzando repository→usecase→ruta pueden dejar de compartir prototipo). Fix: discriminar por `error.name` en vez de `instanceof`.
  - Además, en el medio de este diagnóstico apareció un error humano de copy-paste: `app/api/codigarios/[id]/items/[itemId]/route.ts` había quedado sobreescrito con el contenido de su archivo hermano `items/route.ts` (perdiendo GET/PATCH/DELETE de un item puntual). Reconstruido desde una versión pegada anteriormente en la conversación.
- `distribuciones.test.ts` -- 1 fallo: el test asumía `data.data[0].moduloHorarioId` en la respuesta de `POST /api/distribuciones/[id]/modulos`, un campo que ese endpoint nunca tuvo. Corregido verificando el vínculo real vía `GET /api/distribuciones/[id]` en vez de confiar en un campo inventado.
- `tests/clases.test.ts` -- causa más grande de lo que parecía:
  - Fixture con el bug de siempre (`agenteId`/`turnoId`) -- corregido.
  - `describe("POST /api/clases/generar", ...)` -- el endpoint nunca existió (confirmado con `find` + grep de cero consumidores en frontend). Probablemente quedó de antes de implementar el motor de resolución -- hoy la generación de clases pasa por los disparadores automáticos (`activarPeriodo`, `asignarModulos`), no por un endpoint manual. Se sacó el bloque entero y se reemplazó por un seed directo de `ClaseProgramada` en el `beforeAll` (mismo patrón que `horario.test.ts`/`generacion-clases.test.ts`), ya que esos tests también eran los que alimentaban de datos al resto del archivo.

**PATCH /api/clases/[id] -- bypass del motor de resolución (opción C aplicada):**
- Confirmado: `actualizarClase.ts` escribía `estado` directo vía `claseProgramadaRepository.actualizar`, sin `causa`, sin incrementar `versionResolucion`, sin guard de `DICTADA`, y sin ningún llamado a `resolverClase` después -- peor que los bypasses anteriores porque nada lo autocorregía.
- Confirmado también que `Causa.MANUAL` no está implementado en `resolverEstadoYCausa` (la función ni siquiera recibe la causa actual como input), así que aunque se hubiera seteado `causa: MANUAL`, el motor no lo habría respetado frente a un evento automático posterior.
- Confirmado por grep: cero consumidores frontend de este PATCH.
- Decisión tomada (opción C, de tres presentadas): sacarle a la ruta la capacidad de tocar `estado` -- ahora `actualizarClase` solo acepta `incidenciaId`. Si en el futuro aparece una necesidad real de forzar un estado manual, ahí se evalúa extender el motor (opción B), con el caso concreto en la mano.

### Resuelto más tarde el mismo día (después del cierre inicial)

**Tareas #18 y #20 -- ya no están pendientes, se resolvieron y commitearon:**
- **#18**: `app/protected/dashboard/distribuciones/[id]/page.tsx` migrado de `dist.asignacion.agente` a `dist.asignacion.titularidades?.[0]?.agente` (tipo y JSX actualizados).
- **#20**: `actualizarClase.ts` ahora llama a `resolverClase` después de escribir `incidenciaId`, y re-consulta el estado resuelto antes de devolver la respuesta -- vincular/desvincular una incidencia cambia las condiciones de vigencia de la clase, y solo el motor debía decidir el estado resultante.

**Tests de entorno ablandados (Docker CLI faltante en WSL):**
- `tests/checkEntornoWSL.test.ts` y `tests/preDesarrollo.test.ts` fallaban porque el CLI de `docker` no está en el PATH de esta distro WSL (aunque el motor de Docker Desktop sí responde -- el test "PostgreSQL debería responder consultas" pasa siempre). En vez de depender de un ajuste de integración WSL de Docker Desktop, se usó `it.skipIf(!dockerDisponible)` en ambos archivos: si el CLI no está, el test se saltea (no falla); si está disponible, sigue exigiendo que funcione de verdad. Confirmado funcionando y commiteado.

**Git -- todo el trabajo de esta sesión (y de sesiones previas sin commitear) quedó organizado en 12 commits lógicos** en `refactor-clases-programadas-frontend`, terminando en `61e30bd` ("Resolver puntos pendientes de bajo impacto..."). `git status` limpio a esa altura.

### Auditoría de dashboard/page.tsx (solo lectura, vía Claude Code CLI)

Se pidió una auditoría de solo lectura del árbol de dependencias de `app/protected/dashboard/page.tsx` (componentes hijos, hooks, endpoints y usecases/repos detrás de cada uno) buscando los mismos 4 patrones de bug de esta semana: uso de `asignacion.agente` viejo, escrituras directas de `estado` fuera de `resolverClase`, formas de respuesta de API que no coinciden con el usecase real, y referencias a campos de schema que ya no existen.

**Resultado: sin hallazgos en los 4 patrones.** Puntualmente:
1. El único punto del árbol que resuelve titular (`obtenerClasesOperativas.ts:74-80,100`) ya usa `titularidades: {where: {activo:true, fecha_hasta:null}, take:1, select:{agente:{...}}}` correctamente.
2. Todo el árbol de esta página es de solo lectura (4 rutas GET), sin ningún `prisma.claseProgramada.update`.
3. Los 4 endpoints del árbol (`/api/dashboard/overview`, `/api/dashboard/cobertura-comisiones`, `/api/dashboard/rankings`, `/api/reportes/dashboard`) devuelven exactamente lo que sus hooks/servicios esperan, verificado campo a campo.
4. Todos los campos de modelo usados en las queries del árbol (`ClaseProgramada`, `Incidencia`, `Reemplazo`, `TitularAsignacion`, `CodigarioItem`) existen tal cual en el schema actual.

Nota aparte (no es ninguno de los 4 patrones): `CoberturaDonut.tsx` y `ComisionesProblematicas.tsx` en `features/dashboard/components/` no tienen ningún import activo desde `dashboard/page.tsx` -- parecen código muerto o pendiente de integrar. No se investigó más, quedó fuera del alcance de esa auditoría (retomado el 28/07, ver pendiente unificado más abajo).

### Pendiente que quedó al cierre del 27/07 (histórico -- superado por la lista unificada al final del documento)

1. Seed con datos reales de Codigario + tenant Colegio Ceferino -- armado, sin aplicar.
2. `DEV_TENANT_DOMAIN` -- sin confirmar si bloquea el login del nuevo tenant.
3. Cosmético: tipo `asignacionSuplente` huérfano en `features/incidencias/types/index.ts:86`.
4. Decidir qué hacer con `CoberturaDonut.tsx` y `ComisionesProblematicas.tsx`.

### Estado general al cierre del 27/07

Los 4 focos reales de la corrida completa de tests (agentes, horario, codigarios, distribuciones, clases) y los 2 puntos de bajo impacto pendientes de aquel cierre (#18, #20) quedaron todos diagnosticados, corregidos y commiteados con causa raíz confirmada por evidencia -- ninguno se resolvió por conjetura. Los tests de entorno (Docker CLI) también quedaron resueltos y commiteados. La auditoría de `dashboard/page.tsx` no encontró nada para corregir. Lo único abierto era la carga del seed con datos reales de Codigario + el tenant Colegio Ceferino, que quedó armado pero sin aplicar, más la duda sin confirmar sobre `DEV_TENANT_DOMAIN`.

---

## Sesión 2026-07-28 (planificación)

Sesión de planificación pura, sin cambios de código. Objetivo: reordenar el pendiente, incorporar una feature nueva (reporte de módulos computables) y confirmar el plan de dashboard. El seed de Codigario + tenant Colegio Ceferino queda confirmado en espera, al final de la cola.

### Acuerdos de esta sesión

- **Seed (Codigario real + tenant Colegio Ceferino): en espera.** Se retoma después de todo lo demás. Sigue armado tal cual quedó en la sesión del 27/07, no se toca.
- **Dashboard: se avanza.** Dos frentes acordados:
  1. **Código muerto:** revisar y decidir la baja de `CoberturaDonut.tsx` y `ComisionesProblematicas.tsx` (detectados en la auditoría del 27/07 sin imports activos desde `dashboard/page.tsx`), más cualquier otro muerto que aparezca al revisar el árbol con ese objetivo puntual.
  2. **Información útil real:** ahora que el motor de `causa` funciona (confirmado y commiteado el 27/07), el dashboard debería reflejarlo. Punto concreto: si una clase está `SUSPENDIDA`, las gráficas tienen que mostrar la causa, no solo el conteo. A definir en la próxima sesión de implementación: qué gráficas/cards tocan esto puntualmente (arranca por `obtenerClasesOperativas.ts` y lo que consume el dashboard, según la auditoría del 27/07) y cómo se agrupa/visualiza la causa (¿breakdown por causa dentro de "suspendidas", tooltip, columna nueva?).
- **Nueva feature — reporte de módulos computables (licencias/ausencias): entra antes del seed.** Definición abajo.

### Feature nueva: módulos computables para licencias/ausencias

Objetivo: para un docente y un período dado, calcular no la cantidad simple de clases dictadas sino un total ponderado que contempla incidencias con pago parcial o nulo.

**Lógica:**

1. Tomar todas las `ClaseProgramada` del docente en el período.
2. Clase sin incidencia → computa 100%.
3. Clase con incidencia → el `CodigarioItem` de esa incidencia determina el porcentaje computable:
   - paga 100% → computa 100%.
   - paga 85% (u otro porcentaje) → computa ese porcentaje.
   - no paga → computa 0%.
4. El resultado es una suma ponderada, no un conteo. Ejemplo dado:

| Clase | Incidencia | % computable |
|---|---|---|
| Clase 1 | Ninguna | 100% |
| Clase 2 | Ninguna | 100% |
| Clase 3 | Enfermedad | 100% |
| Clase 4 | Art. 23.b | 0% |
| Clase 5 | Otra licencia | 85% |

Total: 1 + 1 + 1 + 0 + 0,85 = **3,85 módulos computables**.

**Modelo conceptual:**

```
Codigario
└── CodigarioItem
      ├── código (ej. 23.b, ENF, XXX)
      ├── descripción
      └── porcentajeComputable (0 / 85 / 100 / ...)
```

El porcentaje vive en el `CodigarioItem` porque es la naturaleza de la incidencia la que determina cómo se computa la ausencia — no es algo que se decida por fuera.

**Flujo:** Docente → clases programadas del período → ¿tiene incidencia? → NO: 100% / SÍ: `CodigarioItem.porcentajeComputable`.

**Preguntas abiertas para cuando se implemente (nada decidido todavía):**

- ¿`porcentajeComputable` es un campo nuevo en `CodigarioItem`, o ya existe algo parecido (el booleano "paga sí/no" mencionado en sesiones previas)? Si ya existe un booleano, hay que migrarlo a porcentaje.
- ¿Una clase puede tener más de una incidencia simultánea? Si sí, ¿cómo se resuelve el porcentaje (la más restrictiva, la más reciente, error)?
- ¿El reporte es por docente individual, o también agregado por institución/período para todos los docentes?
- ¿Formato de salida? (¿endpoint que devuelve el número, tabla en UI, export a Excel/PDF?)
- ¿Cómo se define "período" — mes calendario, ciclo lectivo, rango arbitrario?

---

## Pendiente unificado (reemplaza las listas de ambas sesiones)

1. **Reporte de módulos computables** — cerrar las preguntas abiertas de la feature (arriba) y recién ahí implementar.
2. **Dashboard** — bajar código muerto (`CoberturaDonut.tsx`, `ComisionesProblematicas.tsx` y lo que aparezca) + incorporar causa en las gráficas de clases suspendidas.
3. **Seed real (Codigario + Colegio Ceferino)** — en espera, se retoma al final. Pasos ya definidos en la sesión del 27/07: pegar `seed.ts`, agregar `SEED_CEFERINO_PASSWORD` al `.env` (confirmar `.gitignore` antes), `npx prisma db seed`, commit.
4. **`DEV_TENANT_DOMAIN`** — sigue sin confirmar si bloquea el login del nuevo tenant. Ligado al seed, se resuelve en el mismo momento (`grep -rn "DEV_TENANT_DOMAIN" ~/gestor_clean --include="*.ts" --include="*.tsx"`).
5. **Cosmético:** `features/incidencias/types/index.ts:86` — tipo `asignacionSuplente` huérfano, sin uso en runtime.

## Estado general (al 28/07)

Sesión de planificación, sin código tocado. Se confirma: seed en espera, dashboard avanza en dos frentes concretos (código muerto + causa visible en gráficas), y se define una feature nueva (módulos computables para licencias) que entra antes del seed en la cola. Falta cerrar las preguntas abiertas de esa feature antes de empezar a implementarla.