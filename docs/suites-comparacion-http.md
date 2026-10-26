# Suites HTTP de comparación (referencia para la Fase 7)

Medido el 26/10/2026 sobre la rama `fix/motor-clases-fase-3`: HEAD `0ba1fc3` comparado contra la base `452a771` (fin de la Fase 2). Reemplaza a la referencia vieja de "9 suites, 247 tests, 31 fallos" del informe del 22/10, que no tenía la lista de archivos y no se puede reproducir.

## Qué se corre

Son todos los archivos de `tests/` que usan `BASE_URL` o `authHeaders` (`grep -lE "BASE_URL|authHeaders" tests/*.test.ts`). Se corren uno por uno contra un servidor propio en el puerto 3100.

| Suite | Tests | Fallan | Pasan |
|---|---:|---:|---:|
| `agentes.test.ts` | 15 | 2 | 13 |
| `asignaciones.test.ts` | 32 | 3 | 29 |
| `auth.test.ts` | 14 | 1 | 13 |
| `clases.test.ts` | 16 | 1 | 15 |
| `codigarios.test.ts` | 50 | 2 | 48 |
| `distribuciones.test.ts` | 35 | 5 | 30 |
| `horario.test.ts` | 13 | 2 | 11 |
| `incidencias.test.ts` | 47 | 6 | 41 |
| `instituciones.test.ts` | 12 | 0 | 12 |
| `mi-institucion.test.ts` | 11 | 2 | 9 |
| `middleware.test.ts` | 2 | 0 | 2 |
| `modulosHorarios.test.ts` | 31 | 2 | 29 |
| `reemplazos.test.ts` | 20 | 4 | 16 |
| `reportes-modulos-computables.test.ts` | 13 | 7 | 6 |
| `unidades.test.ts` | 21 | 2 | 19 |
| `usuarios.test.ts` | 25 | 3 | 22 |
| **16 suites (base de comparación)** | **357** | **42** | **315** |
| `rutasReconciliacion.test.ts` (nueva en la 3c, no existe en `452a771`) | 3 | 0 | 3 |

En `452a771` y en `0ba1fc3` fallan los mismos 42 tests, idénticos por nombre.

## Los 42 fallos previos

- **"rechaza sin tenant (400)"** (26): `agentes` (GET, POST), `asignaciones` (GET, POST), `auth` (login), `clases` (GET), `codigarios` (GET, POST), `distribuciones` (GET, POST), `horario` (GET `/horario`, GET `/horario/institucion`), `incidencias` (GET, POST), `mi-institucion` (GET, PATCH), `modulosHorarios` (GET, POST), `reemplazos` (GET, POST), `reportes-modulos-computables` (cálculo ponderado), `unidades` (GET, POST) y `usuarios` (DELETE, GET, POST).
- `asignaciones`: DELETE > ya no aparece en GET después de eliminada.
- `distribuciones`: DELETE > ya no aparece en GET después de eliminada; POST > rechaza sin version (400); POST > rechaza versión duplicada (409).
- `incidencias`: Camino INCIDENCIA > crear incidencia sin reemplazo suspende las clases del rango; > eliminar la incidencia libera las clases y vuelven a PROGRAMADA; > reactivar la incidencia re-vincula y re-suspende las clases; PATCH > rechaza rango inválido (400).
- `reemplazos`: DELETE > elimina (soft delete) el reemplazo y la clase permanece PROGRAMADA; POST > crea un reemplazo sobre una clase sin incidencia.
- `reportes-modulos-computables`: calcula 3.85 módulos computables con rango arbitrario; mismo resultado con período por PeriodoOperativo; mismo resultado con período por mes calendario; devuelve el detalle con el porcentaje aplicado por clase; rechaza sin agenteId (400); respeta historial de TitularAsignacion > trae clases de ambos cargos.

## Procedimiento

1. Verificar que los puertos 3000 y 3100 están libres: `ss -ltnp | grep -E ':3000|:3100'`.
2. Levantar el servidor: `NODE_ENV=test npx next dev -p 3100` (con `NODE_ENV=test`, `lib/prisma.ts` toma `.env.test`).
3. Verificar la base: hacer una petición (por ejemplo `curl localhost:3100/api/mi-institucion`) y extraer del log solo el nombre de la base, que tiene que ser `gestor_test`. No copiar la línea `DB USADA` completa.
4. Correr cada suite: `TEST_BASE_URL=http://localhost:3100/api npx cross-env NODE_ENV=test vitest run tests/<suite>`.
5. Comparar por nombre de test (las líneas `FAIL  tests/...`), no solo por cantidad.
6. Para medir la base:
   - Crear un worktree en el commit de referencia, con `node_modules` enlazado y `.env.test` copiado.
   - Levantar su servidor con `next dev --webpack -p 3100`: Turbopack rechaza un `node_modules` enlazado fuera de la raíz.
