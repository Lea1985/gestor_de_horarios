# ALNEXT — Arquitectura de Planificación Académica
## Documento de decisiones consolidadas (v1)

> Este documento congela las decisiones tomadas hasta ahora. Es la referencia única antes de tocar schema o código. Cualquier cambio posterior a esto debe reflejarse acá primero.

---

## 1. Principio rector (no negociable)

> **La historia nunca se modifica. Solo puede recalcularse la planificación presente y futura.**

- Ningún proceso puede modificar, eliminar o regenerar una `ClaseProgramada` con fecha anterior a hoy.
- Toda modificación actúa exclusivamente sobre planificación futura.
- Una `ClaseProgramada` nunca se elimina y nunca cambia de identidad.

Esto es la base de todo lo demás. Si en algún momento una decisión de implementación entra en conflicto con este principio, el principio gana.

---

## 2. Separación Estado / Causa — ACORDADO

Se mantienen como dos conceptos distintos:

| Concepto | Qué representa | Ejemplos |
|---|---|---|
| **Estado** | Qué ocurrió finalmente con la clase | `PROGRAMADA`, `DICTADA`, `SUSPENDIDA`, `REEMPLAZADA` |
| **Causa** | Qué originó ese resultado | `NINGUNA`, `INCIDENCIA`, `CALENDARIO_ESCOLAR`, `PERIODO_OPERATIVO`, `CAMBIO_DISTRIBUCION`, `FIN_ASIGNACION`, `MANUAL` |

**Decisión sobre persistencia (pendiente de duda original, ya resuelta):**
- **Estado y Causa se persisten**, no se calculan al vuelo en cada lectura.
- Se tratan como una **caché derivada**, no como fuente de verdad. La fuente de verdad son las condiciones vigentes (incidencias, calendario, período operativo, distribución horaria).
- Motivo: performance en listados masivos, y necesidad de "congelar" un resultado histórico aunque después cambien las reglas de negocio (ej. cambiar el orden de precedencia no debe recalcular mágicamente el pasado).
- **Pendiente de definir en schema:** agregar campo `causa` (enum) a `ClaseProgramada`. Hoy el schema ya tiene `incidenciaId` y `calendarioEscolarId` como FK nullable (trazabilidad al detalle, el "quién"), pero falta el enum que indique cuál mecanismo ganó la precedencia (el "qué tipo de causa").
- **Pendiente de definir:** campo tipo `resueltoEn: DateTime` o `versionResolucion: Int` para poder auditar/forzar recálculos masivos cuando cambie una regla de negocio.

---

## 3. Máquina de estados — ACORDADO (con matiz)

- **No** se modela el Motor de Resolución como una state machine transicional clásica (tipo "on INCIDENCIA_CREATED transition to X").
- Motivo: el estado final depende de la **combinación** de condiciones vigentes en un momento dado, no de la última transición ocurrida. Es un problema de recalcular una función pura sobre un snapshot de condiciones, no de historial de transiciones.
- **Sí** se puede usar una state machine liviana, pero solo como **validación de sanity check** (ej. invariante: nunca pasar de `DICTADA` a `PROGRAMADA`), no como motor de cálculo.
- El cálculo real es conceptualmente:
  ```
  resolver(clase, condicionesVigentes) -> { estado, causa }
  ```
  Una función determinística e idempotente, sin memoria de "cómo llegó ahí".

---

## 4. Precedencia entre causas — ACORDADO

Orden inicial fijo, de mayor a menor prioridad:

1. `INCIDENCIA`
2. `CAMBIO_DISTRIBUCION`
3. `PERIODO_OPERATIVO`
4. `CALENDARIO_ESCOLAR`
5. `NINGUNA`

**Decisión de diseño (nueva, a incorporar):**
- Aunque se use este orden fijo al principio, **modelarlo desde el día uno como configuración** (tabla o estructura tipo `institucionId + causa + prioridad`), no hardcodeado en código.
- Motivo: se sabe de antemano que se va a necesitar precedencia configurable por institución/tipo de evento de calendario en el futuro. Pagar el costo de modelarlo ahora es más barato que migrar después.

---

## 5. Arquitectura de motores — ACORDADO

Tres componentes con responsabilidad única:

### Motor de Generación
- Responsable exclusivamente de que existan las `ClaseProgramada` que deberían existir.
- **Nunca** determina estados funcionales (`DICTADA`, `REEMPLAZADA`, `SUSPENDIDA`, etc.).
- Interviene en: activación/ampliación de Período Operativo, publicación de nueva versión de Distribución Horaria, creación/finalización de Asignación.
- Garantiza: no duplicar clases, reutilizar clases futuras existentes, conservar clases pasadas intactas.

### Motor de Resolución
- Determina estado final, causa, reemplazo asociado y demás atributos derivados de una clase.
- Es el **único** módulo autorizado a decidir el estado final de una `ClaseProgramada`.
- Debe ser **idempotente**: recibe la clase + condiciones vigentes y recalcula desde cero siempre, nunca aplica deltas incrementales.

### Motor de Reconciliación
- Detecta qué clases fueron afectadas por un cambio masivo (modificación de Período Operativo, importación de Calendario Escolar, nueva Distribución Horaria, modificación de Incidencia).
- Construye el conjunto mínimo de clases a reevaluar.
- Invoca al Motor de Resolución solo sobre ese conjunto — evita recalcular toda la planificación institucional.
- **Aporta valor real** (no es complejidad innecesaria): sin él, la lógica de invalidación de caché quedaría desparramada en cada caso de uso, justo lo que la arquitectura busca evitar.

### Flujo general acordado

```
Evento de negocio
       │
       ▼
Motor de Generación        (garantiza existencia de clases)
       │
       ▼
Motor de Reconciliación     (detecta qué clases hay que re-resolver)
       │
       ▼
Motor de Resolución         (calcula estado + causa + reemplazo)
```

---

## 5.1 Jerarquía de propiedad: Período Operativo como contenedor del ciclo de vida — ACORDADO

Esta regla explica **por qué** nunca hay que borrar ni regenerar clases, más allá de la regla general de inmutabilidad histórica.

> Una `ClaseProgramada` pertenece siempre al Período Operativo que la originó. Mientras ese período siga `ACTIVO`, la clase es un registro permanente. Distribución Horaria, Incidencias y Calendario Escolar son **moduladores de estado** dentro de ese ciclo de vida — nunca creadores ni destructores de identidad.

**Ejemplo concreto (idas y vueltas de Distribución Horaria):**

Asignación con Distribución V1 = lunes, 2 módulos. Período Operativo activo de punta a punta.

```
Período Operativo ACTIVO
        │
        ├── Distribución V1 (lunes) → genera clases de lunes
        │
        ├── Distribución cambia a V2 (martes)
        │     → clases de lunes: Estado = SUSPENDIDA, Causa = CAMBIO_DISTRIBUCION
        │       (NO se borran, siguen existiendo como registro)
        │     → se generan clases nuevas de martes
        │
        └── Distribución vuelve a V1 (lunes)
              → clases de lunes: se REUTILIZAN (mismo registro, no se crean de nuevo)
                Estado pasa de SUSPENDIDA a PROGRAMADA, Causa de CAMBIO_DISTRIBUCION a NINGUNA
              → clases de martes: Estado = SUSPENDIDA, Causa = CAMBIO_DISTRIBUCION
```

Todo esto ocurre **sin que el Período Operativo se toque en ningún momento**. Lo único que se mueve es Estado/Causa de las clases; el período es el marco que nunca cambia y por eso las clases nunca dejan de existir.

**Condición técnica que lo hace posible:** la identidad de una `ClaseProgramada` depende de `asignacionId + fecha + módulo` — el índice único `clase_unica_por_modulo_fecha` ya existente en el schema es justo lo que permite al Motor de Generación preguntar "¿ya existe una clase para esta combinación puntual?" antes de decidir si crea o reutiliza.

**Pendiente marcado como caso de prueba explícito:** si una clase suspendida por `CAMBIO_DISTRIBUCION` tenía una Incidencia con reemplazo asignado antes del cambio, y luego se revierte la distribución — el reemplazo, ¿se reactiva automáticamente junto con la clase reutilizada, o queda huérfano y requiere re-evaluación manual? Esto lo resuelve el Motor de Resolución al recalcular (no el de Generación), pero debe quedar como caso de prueba obligatorio antes de dar por cerrado el Motor de Resolución.

---

## 5.2 Regla unificada de rango de generación — ACORDADO

Aplica tanto para creación de una Asignación nueva dentro de un Período ya activo, como para publicación de una nueva Distribución Horaria en una Asignación existente.

> El rango de generación de clases es siempre: **desde la fecha en que se ejecuta la acción (hoy), hasta `fecha_hasta` del Período Operativo vigente.**

- No se usa la `fecha_inicio` cargada en la Asignación (dato administrativo/histórico) como punto de partida de la generación — se usa la fecha real en que se realiza la acción.
- Esto evita el caso borde de asignaciones cargadas con `fecha_inicio` pasada: no hay dos caminos (uno normal y uno "especial" para fechas pasadas), hay un solo camino, porque el punto de partida siempre es la fecha de la acción.
- El **techo** siempre es `fecha_hasta` del Período Operativo vigente — nunca se genera planificación más allá de ese límite, sin importar qué evento disparó la generación.
- **No requiere cambios de schema.** Usa campos ya existentes: `Asignacion.fecha_inicio`, `DistribucionHoraria.fecha_vigencia_desde`, `PeriodoOperativo.fecha_hasta`. Es una regla de comportamiento del Motor de Generación, no una regla estructural.

---

## 6. Casos de uso como orquestadores delgados — ACORDADO

Los casos de uso no contienen lógica de negocio de resolución. Ejemplo de forma correcta:

```
ModificarDistribucionHoraria
       │
       ├── persistir cambio (nueva DistribucionHoraria)
       ├── MotorGeneracion.generar/suspender(...)
       ├── MotorReconciliacion.detectarAfectadas(...)
       └── MotorResolucion.resolver(clases afectadas)
```

---

## 7. Puntos nuevos detectados en la revisión (a resolver antes de tocar schema)

Estos son adicionales a lo que planteaste originalmente en el documento base, y quedan como pendientes explícitos:

1. **Campo `causa` en schema**: falta agregarlo como enum en `ClaseProgramada`. Definir si es un enum simple o si necesita tabla propia para soportar metadata adicional a futuro.
2. **Versión de resolución**: agregar campo para poder auditar cuándo fue resuelta una clase por última vez y forzar recálculos masivos ante cambio de reglas.
3. **Tabla de precedencia configurable**: aunque se use el orden fijo al principio, dejar la estructura preparada (`institucionId + causa + prioridad`) en vez de hardcodear.
4. **Idempotencia y concurrencia**: el Motor de Resolución debe ser puro/idempotente. Definir estrategia de lock optimista (ej. usar `updatedAt` o campo de versión) para evitar carreras cuando dos eventos casi simultáneos afectan la misma clase.
5. **Invariantes de sanity check**: definir qué transiciones de estado se consideran inválidas (para detectar bugs), aunque no se modele como state machine completa.
6. **Reemplazos huérfanos al revertir Distribución Horaria**: cuando una clase suspendida por `CAMBIO_DISTRIBUCION` se reutiliza (ver sección 5.1), definir si un reemplazo previamente asociado se reactiva automáticamente o requiere re-evaluación manual. Marcado como caso de prueba obligatorio del Motor de Resolución.

---

## 7.1 Evaluación de disponibilidad para modificar el schema

Antes de tocar el schema real, esta es la evaluación de qué está maduro y qué no:

### ✅ Maduro — se puede modelar ya

- **`causa` como enum en `ClaseProgramada`**: la lista de valores está estable y validada en varias vueltas de discusión (`NINGUNA`, `INCIDENCIA`, `CALENDARIO_ESCOLAR`, `PERIODO_OPERATIVO`, `CAMBIO_DISTRIBUCION`, `FIN_ASIGNACION`, `MANUAL`). No hay indicios de que vaya a cambiar la lista en el corto plazo.
- **Relación de la `causa` con las FKs ya existentes** (`incidenciaId`, `calendarioEscolarId`): el patrón de "enum para el tipo + FK nullable para el detalle" ya está validado con el uso real que le dimos en varios ejemplos. Falta solo agregar el enum; las FKs de detalle ya están.

### ⚠️ Necesita una decisión chica antes de tocar schema (no bloqueante, pero conviene resolver primero)

- **`resueltoEn` / `versionResolucion`**: falta decidir cuál de las dos, no las dos. Un `DateTime` alcanza para auditoría simple; un contador de versión sirve además para lock optimista (sección 7 punto 4). Como ya identificamos que se necesita concurrencia/idempotencia en el Motor de Resolución, conviene resolver ambas necesidades con un solo campo entero de versión en vez de agregar dos campos separados después.
- **Tabla de precedencia configurable**: es de bajo riesgo agregarla ya (estructura simple `institucionId + causa + prioridad`), pero no es urgente si se arranca con el orden fijo hardcodeado como fallback. Se puede diferir sin costo real de migración futura, porque no toca `ClaseProgramada` en sí.

### 🚫 Todavía no maduro — falta resolver antes de tocar schema

- **Reemplazos huérfanos al revertir distribución** (pendiente 6): esto podría implicar un campo o una regla en `Reemplazo` (ej. algún estado tipo "pendiente de reactivación") dependiendo de cómo se resuelva. Tocar `ClaseProgramada`/`Reemplazo` antes de definir esto genera riesgo de tener que rehacer la migración.
- **Invariantes de sanity check / transiciones inválidas** (pendiente 5): todavía no están enumeradas explícitamente las transiciones prohibidas. No bloquea el schema en sí (es lógica de aplicación, no estructura), pero conviene tenerlo definido antes de dar por cerrado el Motor de Resolución.

### Recomendación

Se puede empezar a modificar el schema **ahora**, acotado a lo que está maduro:
1. Agregar enum `Causa` y campo `causa` en `ClaseProgramada`.
2. Agregar campo de versión (`versionResolucion: Int`) en `ClaseProgramada`, cubriendo auditoría + preparación para lock optimista.
3. Dejar la tabla de precedencia configurable para una segunda pasada (no bloquea nada, se puede seguir con el orden fijo por ahora).
4. **No tocar `Reemplazo` todavía** — esperar a resolver el caso de reemplazos huérfanos antes de decidir si necesita campo nuevo.

---

## 8. Invariantes del dominio (ya definidos, se mantienen)

**Clases Programadas**
- Nunca se elimina.
- Nunca cambia su identidad.
- Pertenece siempre a una única Asignación y a un único Período Operativo.

**Historia**
- Ningún proceso puede modificar clases anteriores a la fecha actual.
- La historia operativa es inmutable.

**Planificación**
- Nunca existen dos Clases Programadas para la misma Asignación, fecha y módulo.
- Toda Clase Programada proviene de una Distribución Horaria vigente o de una decisión explícita del sistema.

**Resolución**
- El estado final siempre lo determina el Motor de Resolución.
- Ningún otro módulo modifica directamente el estado de una Clase Programada.

---

## 9. Orden de implementación acordado

1. ✅ Documento de arquitectura (este documento).
2. ✅ Schema de Prisma (`causa`, `versionResolucion`) — migrado en base real.
3. ✅ Tipos y entidades del dominio (`lib/types/claseProgramada.ts`).
4. ⏭️ Repositorio de `ClaseProgramada` — no se creó uno nuevo; se siguió extendiendo el `claseProgramadaRepository.ts` y `claseProgramadaService.ts` existentes en vez de reemplazarlos (ver sección 11).
5. 🔶 Motor de Generación — no existe como módulo separado; sigue viviendo repartido entre `lib/helpers/clases.ts::generarClases()` y `claseProgramadaService.ts::generarParaRango`. Se le sumó `suspenderNoVigentes` (sección 11.3), que cubre la mitad "reconciliación" que le faltaba.
6. 🔶 Motor de Resolución — implementado en `lib/services/resolucionClaseService.ts` (sección 11.6), pero **todavía no conectado** a ningún caso de uso.
7. ⏳ Motor de Reconciliación — no empezado.
8. 🔶 Casos de uso — los 3 de `distribuciones/` migrados al nuevo patrón (sección 11.4); `activarPeriodo.ts` y `generarClasesIncidencia.ts` todavía no.
9. ⏳ APIs — sin cambios de contrato salvo el rename `clasesEliminadas` → `clasesSuspendidas` ya reflejado en frontend.
10. ⏳ Páginas — sin cambios.

---

## 11. Implementación real — estado a la fecha (actualización)

Esta sección registra lo que ya se hizo en código real, más allá de lo planificado en las secciones anteriores. Reemplaza en vigencia a cualquier plan anterior que haya quedado desactualizado.

### 11.1 Hallazgo importante: el código real no cumplía el principio rector

Al revisar `claseProgramadaRepository.ts` y `claseProgramadaService.ts` existentes, se encontró que **el sistema sí eliminaba `ClaseProgramada` físicamente** (`eliminarEnRango`, `eliminarFuturas`) en tres casos de uso: `asignarModulos.ts`, `nuevaVersionDistribucion.ts`, `eliminarDistribucion.ts`. Esto violaba directamente la Sección 1 (la historia nunca se modifica / nunca se elimina una clase). Los tres fueron migrados (ver 11.3).

También se encontró que `generarClasesIncidencia.ts` bypaseaba `claseProgramadaService` y llamaba directo a `lib/helpers/clases.ts::generarClases()` — inconsistencia arquitectónica todavía sin resolver, marcada como pendiente (ver 11.5).

### 11.2 Tipos de dominio — implementado

Archivo nuevo: **`lib/types/claseProgramada.ts`**. Convención elegida: tipos transversales van en `lib/types/` (mismo patrón que el ya existente `lib/types/context.ts`), no en una carpeta `lib/domain/` nueva ni anidados dentro de un subdominio (a diferencia de `lib/reporting/types/`, que sí es específico de ese subdominio).

Tres tipos definidos:
- `RangoGeneracion` — input común (`institucionId`, `asignacionId`, `unidadId`, `comisionId`, `desde`, `hasta`) para operaciones sobre un tramo de fechas de una Asignación. Ya en uso real en `generarParaRango` y `suspenderNoVigentes`.
- `CondicionesVigentes` — input del Motor de Resolución.
- `ResultadoResolucion` — output del Motor de Resolución (`{ estado, causa }`).

### 11.3 Función `suspenderNoVigentes` — implementado, reemplaza a `eliminarEnRango`

Nueva función en `claseProgramadaService.ts`. Reemplaza el patrón "borrar y recrear" por "reconciliar en las dos direcciones":
- Calcula en memoria (via `generarClases()`, sin tocar la base) qué fecha+módulo correspondería con la distribución/módulos nuevos.
- **Suspende** (`estado: SUSPENDIDA`, `causa: CAMBIO_DISTRIBUCION`) las clases existentes que ya no corresponden.
- **Reactiva** (`estado: PROGRAMADA`, `causa: NINGUNA`) las clases que estaban `SUSPENDIDA` por `CAMBIO_DISTRIBUCION` y que vuelven a corresponder — esto resuelve el caso de prueba pendiente de la sección 5.1 (lunes → martes → lunes) para el escenario donde no hay incidencia/reemplazo de por medio.
- Guarda especial: si `modulosNuevos` viene vacío (caso de `nuevaVersionDistribucion` y `eliminarDistribucion`, donde no hay "distribución nueva" con la que comparar), no se llama a `generarClases()` — se trata `clavesEsperadas` como vacío directamente, para evitar el default de "lunes a viernes" que tiene `generarClases()` en modo turno cuando `modulos.length === 0`.
- Nunca toca `DICTADA`. Nunca borra `Reemplazo` asociado — queda intacto como historial (decisión explícita, ver 11.6 para el pendiente relacionado).

`eliminarEnRango` **se conserva en el código** (no se borró), documentada como temporal, porque en el momento de escribir esto ya no la llama ningún caso de uso migrado — queda como código muerto candidato a limpieza futura.

### 11.4 Casos de uso migrados — implementado (los 3)

| Archivo | Cambio |
|---|---|
| `lib/usecases/distribuciones/asignarModulos.ts` | `eliminarEnRango` → `suspenderNoVigentes` con los módulos nuevos reales. Response: `clasesEliminadas` → `clasesSuspendidas`. |
| `lib/usecases/distribuciones/nuevaVersionDistribucion.ts` | Mismo reemplazo, con `modulosNuevos: []` (la nueva versión nace vacía). Response: `clasesEliminadas` → `clasesSuspendidas`. |
| `lib/usecases/distribuciones/eliminarDistribucion.ts` | Mismo reemplazo, con `modulosNuevos: []` (la distribución se borra por completo). Response: `clasesEliminadas` → `clasesSuspendidas`. |

Frontend actualizado en consecuencia: `features/modulosDistribucion/services/modulosDistribucionService.ts` y `features/distribuciones/types/index.ts` (tipo `EliminarDistribucionResult`). Se verificó por grep que ningún componente `.tsx` accedía a `.clasesEliminadas` directamente, así que el renombre fue seguro.

### 11.5 Bug pre-existente corregido: `recalcularSuspendidasPorCalendario`

Al construir `obtenerCondicionesVigentes` (ver 11.6) se detectó que el campo `calendarioEscolarId` de `ClaseProgramada` **nunca se seteaba** en ningún flujo real, pese a existir en el schema desde antes de esta ronda de cambios. La función `recalcularSuspendidasPorCalendario` (llamada desde `crearCalendarioEscolar.ts` y `actualizarCalendarioEscolar.ts`) solo tocaba `estado`, nunca `causa` ni `calendarioEscolarId` — y por eso, en su propio comentario original, explicitaba que no podía revertir automáticamente una suspensión por calendario ("no tenemos forma de distinguirlas hoy").

Corregido: ahora setea `causa: CALENDARIO_ESCOLAR` + `calendarioEscolarId` al suspender, y **ya puede revertir automáticamente** al desmarcar un feriado — solo afecta clases con esa `causa` y ese `calendarioEscolarId` puntual, nunca una clase suspendida por otra causa (ej. `INCIDENCIA`). Los dos usecases fueron actualizados para pasar el `calendarioEscolarId` correspondiente.

### 11.6 Motor de Resolución — implementado, todavía NO conectado

Archivo nuevo: **`lib/services/resolucionClaseService.ts`**. Convención elegida: sigue el patrón real del código (`*Service`, no se crea una carpeta `lib/motores/`), documentando en comentarios que conceptualmente es el "Motor de Resolución" del documento de arquitectura.

Tres funciones:
- **`resolverEstadoYCausa(condiciones: CondicionesVigentes): ResultadoResolucion`** — función pura, sin `async`, sin tocar Prisma. Aplica la tabla de precedencia de la Sección 4 (`INCIDENCIA > PERIODO_OPERATIVO > CALENDARIO_ESCOLAR > NINGUNA`). **`CAMBIO_DISTRIBUCION` queda deliberadamente afuera de esta función** — sigue siendo un atajo aparte, decidido directamente por `suspenderNoVigentes` (sección 11.3), porque ese camino ya está probado en producción. Si en el futuro se decide unificar todo bajo este motor, es el punto de extensión natural.
- **`obtenerCondicionesVigentes(claseId, tenantId): Promise<CondicionesVigentes>`** — consulta la base y arma el objeto de condiciones. Depende de `periodoOperativoRepository.obtenerVigente(tenantId)` (verificado contra el repositorio real: devuelve `fecha_desde`/`fecha_hasta`, tal como se asumió).
- **`resolverClase(claseId, tenantId): Promise<ResultadoResolucion & { actualizada: boolean }>`** — orquestador: no toca `DICTADA`, compara contra el estado actual, y si cambió, persiste incrementando `versionResolucion`.

**Pendiente crítico:** ningún caso de uso llama todavía a `resolverClase`. El motor existe pero está desconectado. Falta decidir el punto de enganche — candidatos identificados: `activarPeriodo.ts` (todavía sin migrar del todo), `generarClasesIncidencia.ts` (el que bypasea el servicio, ver 11.1), o construir primero el Motor de Reconciliación para resolver en lote en vez de clase por clase. Decisión todavía no tomada.

---

**Primera modificación de schema ya aplicada y migrada en base real** (confirmada):

Migración `20260718195325_agrega_causa_y_version_resolucion` corrida y sincronizada contra `gestor_horarios` (PostgreSQL). Prisma Client regenerado (v5.22.0).

```prisma
enum Causa {
  NINGUNA
  INCIDENCIA
  CALENDARIO_ESCOLAR
  PERIODO_OPERATIVO
  CAMBIO_DISTRIBUCION
  FIN_ASIGNACION
  MANUAL
}
```

```prisma
model ClaseProgramada {
  // ...campos existentes sin cambios...
  causa             Causa @default(NINGUNA)
  versionResolucion Int   @default(0)
  // ...resto sin cambios...

  @@index([estado, causa])
}
```

Se decidió explícitamente **no** hacer estos campos opcionales (`Causa?`, `Int?`): el `@default(...)` ya garantiza una migración segura sobre filas existentes (Prisma completa automáticamente todas las clases actuales con `causa = NINGUNA` y `versionResolucion = 0`), y mantenerlos no-nullable evita la ambigüedad de un estado `null` que no está contemplado en ninguna regla de negocio definida hasta ahora.

**Sigue pendiente, deliberadamente afuera de esta modificación:**
- Tabla de precedencia configurable (no urgente, sin riesgo de diferirla).
- Cualquier cambio en `Reemplazo` (pendiente de resolver el caso de reemplazos huérfanos al revertir Distribución Horaria, sección 7 punto 6).

**Próximo paso pendiente de decisión:** dónde conectar `resolverClase` por primera vez (ver 11.6) — `activarPeriodo.ts`, `generarClasesIncidencia.ts`, o construir antes el Motor de Reconciliación para resolver en lote.
