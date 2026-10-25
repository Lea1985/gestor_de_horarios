# Fase 3 — Reconciliación: diagnóstico y plan

Rama: `fix/motor-clases-fase-3` (desde `452a771`).

## 1. R2 confirmado leyendo el código

| Punto del plan | Código | Estado |
|---|---|---|
| "Editar" recorre el período entero | `asignarModulos.ts`: `desde = max(vigencia_desde, periodo.desde)`, `hasta = periodo.fecha_hasta` | [C] |
| `generarParaRango` deja `incidenciaId` null | `claseProgramadaService.ts`, `generarClases({ incidenciaId: null })`; además crea los días de feriado como SUSPENDIDA/CALENDARIO sin pasar por el motor y no resuelve nada | [C] |
| Nueva versión: solo desde hoy y vacía | `nuevaVersionDistribucion.ts`: cierra la vieja ayer, la nueva arranca hoy sin módulos; `suspenderNoVigentes(modulosNuevos: [])` desde hoy | [C] |
| `reactivarDistribucion` revive todas las CAMBIO_DISTRIBUCION | Re-resuelve todas las de la asignación. Con el motor de la Fase 2 solo reviven las de módulo vigente: el daño ya está acotado | [C], mitigado |
| `migrarReemplazoATramo` | Sin `incidenciaId`, pasa a REEMPLAZADA sin causa, solo toca PROGRAMADA | [C] |
| `suspenderNoVigentes` salta INCIDENCIA | Sí; además reactiva CAMBIO → PROGRAMADA/NINGUNA directo, sin mirar licencia ni calendario | [C] |
| `suspenderPorFinAsignacion` | `desde = hoyLocal()` desde la Fase 1. El caso de la asignación 43 (20/10) es anterior a esa corrección o vino de otro camino; no lo puedo reproducir. La reconciliación lo resuelve con la regla B | Ver nota |

**Discrepancia:** `eliminarDistribucion` ya **no** usa `requiereConfirmacion`: bloquea si hubo incidencias (UX-DIS-011). El patrón vive en `asignarModulos` y `nuevaVersionDistribucion` (`requiereConfirmacion` + `tramos` + `mantenerReemplazo`), y la UI lo consume en `features/modulosDistribucion` (`ModalMigrarReemplazos`).

## 2. Diseño de `reconciliarAsignacion`

Archivo nuevo: `lib/services/reconciliacionService.ts`.

```
reconciliarAsignacion({ tenantId, asignacionId, desde, hasta?, confirmarAnulacion?, reescribirDictadas?, db })
```

1. **Rango:** `[desde, hasta] ∩ período vigente`. Sin período no genera nada; solo resuelve lo que ya existe.
2. **Generación:** por cada versión de distribución que rige en el rango (reglas B y C), llama a `generarParaRango` en la intersección. No genera en fechas donde la asignación no rige. Las clases nuevas se vinculan a la licencia activa que cubre su fecha (gana la de id más alto, mismo criterio que `desvincularIncidencia`) y pasan por el motor.
3. **Re-resolución:** cada clase no DICTADA de la asignación en el rango pasa por `resolverClase(db)`. DICTADA solo si `reescribirDictadas` (ver pregunta 1).
4. **Reemplazos:**
   - Clase que termina en FIN_ASIGNACION o CAMBIO_DISTRIBUCION, con fecha >= hoy local y reemplazo activo: si no vino `confirmarAnulacion`, se lanza `RequiereConfirmacionError` con la lista. La transacción hace rollback y el usecase devuelve `{ requiereConfirmacion: true, reemplazosAAnular }`. La previsualización es exacta porque se calcula con el cambio real aplicado.
   - Con confirmación: `activo=false` y `deletedAt`.
   - Fechas pasadas: se conservan.
5. **Transacción:** todo el usecase (cambio de módulos o versión + reconciliación) va en un `prisma.$transaction(fn, { timeout: 60_000 })`.

**Cliente transaccional:** se agrega un parámetro opcional `db: Db = prisma`, con `type Db = PrismaClient | Prisma.TransactionClient`, a:
- `resolverClase`
- `obtenerCondicionesVigentes`
- `periodoOperativoRepository.obtenerVigente`
- `generarParaRango`
- `claseProgramadaRepository.listarFeriados`
- `vincularIncidencia`

Los llamadores actuales no cambian.

`generarParaRango` pasa a `createManyAndReturn` (Prisma 5.22, PostgreSQL), para conocer los ids nuevos.

## 3. Subfases

**3a. Infraestructura** (unos 5 archivos)
- Parámetro `db` en el motor y sus dependencias.
- `generarParaRango` vincula licencias y resuelve las clases nuevas (bug 3). Afecta también a `activarPeriodo` y `crearDistribucion`, lo cual está bien.
- Tests:
  - generación con licencia vigente (padre e hija);
  - generación en día de feriado con artículo que paga y que no paga;
  - rollback de una transacción que usa `resolverClase(tx)`.
- Costo: activar un período resuelve cada clase nueva, unas 10 consultas por clase. Una vez por período, aceptable.

**3b. `reconciliarAsignacion`** (servicio nuevo, sin cambiar llamadores)
- Tests:
  - módulo que se quita y vuelve;
  - reemplazo futuro anulado con confirmación (y sin confirmación: rollback y lista);
  - reemplazo pasado conservado;
  - clase del módulo quitado con licencia: pasa a CAMBIO_DISTRIBUCION y su reemplazo futuro se anula (hallazgo de la Fase 2);
  - rollback ante un error a mitad de camino (con `vi.mock` parcial del motor, sin ganchos en el código de producción).

**3c. Migración de llamadores y retiro de atajos** (más de 8 archivos, incluida la UI mínima)
- Llamadores:
  - `asignarModulos`: `desde` opcional (por defecto hoy local; con `desde` < hoy, ver pregunta 1).
  - `nuevaVersionDistribucion`: `desde` elegido (por defecto hoy).
  - `eliminarDistribucion`.
  - `reactivarDistribucion`: desde el día local del `deletedAt` anterior.
  - `eliminarAsignacion`: desde el día de la baja.
  - `reactivarAsignacion`: desde el día local del `deletedAt` anterior.
- Rutas: aceptan `desde`, `confirmarAnulacion` y `reescribirDictadas`.
- Se retiran `suspenderNoVigentes`, `migrarReemplazoATramo`, `suspenderPorFinAsignacion` y `resolverCoberturaDelTramo`.
- Tests:
  - los dos enroques de 2do A con licencia vigente, de principio a fin;
  - edición retroactiva;
  - baja y reactivación de asignación con clases pasadas y futuras.
- Tests existentes que pueden cambiar por cambio de comportamiento buscado (`generacion-clases`, `distribuciones`): los informo uno por uno antes de tocarlos.

## 4. Decisiones que necesito

1. **"Editar" retroactivo y las DICTADA.** Si la reconciliación no las toca, "Editar desde el inicio" genera clases pasadas del módulo nuevo, que quedan DICTADA al instante, mientras las del módulo quitado siguen DICTADA: duplicados (bug 11). Recomiendo que, con `desde` < hoy y confirmación explícita (`reescribirDictadas`, la advertencia de la decisión 6), las DICTADA del rango [desde, hoy) se re-resuelvan sin la protección de la opción A. Sin confirmación: rollback y aviso con la cantidad.
2. **"Mantener reemplazo" en las clases nuevas.** En el enroque de Historia con licencia, las clases nuevas nacen con la licencia pero sin suplente. Recomiendo reemplazar `migrarReemplazoATramo` así: con `mantenerReemplazo`, por cada licencia cuyos reemplazos futuros anulados sean de un único suplente, crear el reemplazo de las clases nuevas de esa licencia con ese suplente, con `incidenciaId` y validando superposición (las que choquen quedan sin suplente y se informan).
3. **Nueva versión.** Hoy nace vacía: entre crearla y asignarle módulos, la asignación no tiene clases y la reconciliación anularía los reemplazos futuros. Recomiendo que nazca con una copia de los módulos de la anterior (crearla no cambia clases) y que el cambio se haga después con "Editar" sobre la nueva, desde su inicio.
4. **UI.** Recomiendo incluir en 3c lo mínimo:
   - fecha en `ModalNuevaVersion`;
   - en "Editar", opción "desde hoy" o "desde el inicio de la distribución";
   - en `ModalMigrarReemplazos`, la lista de reemplazos a anular.
   La alternativa es solo la API, con la UI usando siempre el valor por defecto (hoy).

## 5. Fuera de alcance (solo anotado)

- `reconciliarPorPeriodoOperativo` (`activarPeriodo`) sigue escribiendo en lote sin pasar por el motor.
- Las clases de la asignación 43 del 20/10: se corrigen solas cuando el motor las vuelve a resolver, o en la reparación de datos de la Fase 7.
- Decisión 4 (versión provisoria): Fase 6.

## 6. Decisiones tomadas (25/10/2026)

1. **"Editar" retroactivo:** sí. Las DICTADA entre `desde` y hoy se re-resuelven solo con confirmación explícita, mostrando cuántas se reescriben. Por defecto, "Editar" rige solo desde hoy.
2. **Mantener reemplazo:** sí, como opción elegida en el modal (nunca automática) y solo si la licencia tenía un único suplente, con `incidenciaId` y validación de superposición. Con varios suplentes, las clases nuevas quedan sin cobertura y se listan.
3. **Nueva versión:** nace con una copia de los módulos de la anterior. Test: crear la copia no cambia ninguna clase ni anula ningún reemplazo.
4. **UI mínima en 3c:** solo los tres elementos propuestos (fecha en "Nueva versión", "desde hoy / desde el inicio" en "Editar", lista de reemplazos a anular en el modal).
5. **Proceso:** subfase por subfase (3a, 3b, 3c), con resumen, tests y comparación contra los 31 fallos previos antes de pasar a la siguiente. Todo test existente que cambie a propósito en 3c se avisa uno por uno antes de tocarlo.
