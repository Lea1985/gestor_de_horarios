# ALNEXT Development Guide

ALNEXT es un sistema de gestión integral para instituciones educativas.

Prioridades: arquitectura limpia, reglas de negocio preservadas, mínimas regresiones, cambios incrementales, sin repetir análisis ya hecho.

## Reglas de oro

**Comprender antes de modificar.** Revisar la instrucción actual, documentación relevante y, si el usuario lo indica, el informe de sesión de continuidad. No repetir una auditoría completa si ya existe análisis documentado suficiente.

**Mínima intervención.** Modificar solo lo necesario para el objetivo pedido. Nada de refactors oportunistas, renombres, "mejoras" no solicitadas o cambios en módulos no relacionados. No reemplazar una implementación existente que funciona solo por considerarla más moderna o elegante. No modificar comportamiento existente salvo que sea necesario para cumplir el objetivo solicitado. Si aparece una mejora independiente: documentarla y proponerla aparte, sin mezclarla.

**No ampliar el alcance.** Resolver el problema pedido, no convertirlo en una auditoría general. Bugs o deuda técnica no relacionados: documentar, no implementar.

**Áreas protegidas — requieren autorización explícita antes de tocar:**

* `schema.prisma` (modelos, relaciones, FKs, índices, migraciones): no modificar ni crear migraciones sin autorización explícita.
* Multi-tenant (`tenant`, `institution`, `organization` y cualquier campo o lógica de aislamiento): fuera de alcance actual. Si una solución los requiere: explicar por qué, impacto, alternativas y esperar aprobación antes de implementar.

**Cambios grandes, por etapas.** Antes de una etapa: objetivo, alcance, archivos principales e impacto. Una vez aprobada una etapa, ejecutarla completa sin re-pedir aprobación por cada paso interno.

**Sprints y documentación histórica son contexto, no requerimientos.** Sirven para entender el porqué de decisiones pasadas; no generan trabajo activo salvo instrucción explícita del usuario.

## Graphify

Usar cuando aporte valor para entender relaciones, localizar flujos o validar hipótesis. No es obligatorio antes de cada acción y no se deben repetir consultas que ya dieron la información necesaria.

```bash
graphify query "<pregunta>"
graphify explain "<concepto>"
graphify path "<A>" "<B>"
```

* `graphify-out/wiki/index.md`: navegación general, si existe.
* `graphify-out/GRAPH_REPORT.md`: revisión arquitectónica amplia, cuando las consultas puntuales no alcancen.

Después de modificar código relevante:

```bash
graphify update .
```

## Arquitectura

```text
API → Use Cases → Services → Repositories → Prisma
```

Las reglas de negocio viven en Use Cases y Services.

No colocar reglas de negocio en:

* API Routes;
* Controllers;
* Pages;
* componentes UI.

No introducir arquitectura paralela sin autorización.

## Tamaño de cambio y aprobación

| Tamaño  | Alcance                                                          | Requiere                                      |
| ------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Pequeño | ≤3 archivos, sin tocar schema ni arquitectura                    | Explicación breve, luego implementar          |
| Mediano | 3–8 archivos, impacto en Services/Use Cases                      | Análisis + propuesta + aprobación previa      |
| Grande  | >8 archivos, cambios arquitectónicos, schema o reglas de negocio | Dividir en etapas, aprobar y validar cada una |

La cantidad de archivos es orientativa. Cualquier cambio que afecte arquitectura, schema o reglas de negocio se considera al menos mediano, independientemente de la cantidad de archivos.

## Fuente de verdad

Orden de prioridad:

1. Instrucciones actuales del usuario.
2. Código actual.
3. `schema.prisma` actual.
4. Reglas de negocio vigentes.
5. Documentación técnica vigente.
6. Informes de sesión indicados explícitamente como continuidad.
7. Sprints y documentación histórica.

Ante contradicción: priorizar la fuente de mayor nivel, informar la discrepancia y no cambiar el sistema solo para alinearlo con historia.

## Prioridad actual: ClaseProgramada

```text
PeriodoOperativo
→ Distribucion / DistribucionHoraria
→ Asignacion
→ ClaseProgramada
→ Incidencia
→ Reemplazo
```

Al tocar estas entidades, considerar el impacto sobre:

* generación;
* modificación;
* suspensión/cancelación;
* calendario;
* incidencias;
* reemplazos.

Reutilizar análisis previo disponible antes de re-auditar.

## Testing

Antes de modificar: revisar tests relacionados y escenarios críticos.

Prioridad:

* generación de `ClaseProgramada`;
* cambios de `PeriodoOperativo`;
* cambios de `Distribucion`;
* cambios de módulos;
* incidencias;
* reemplazos;
* cancelaciones.

No crear frameworks de testing nuevos sin autorización.

Si un test falla: analizar la causa (código, datos o test) antes de tocarlo.

Nunca modificar un test solo para hacer pasar una implementación incorrecta.

## Flujo de trabajo

```text
Contexto existente
→ análisis de lo que falta
→ diagnóstico
→ aprobación (si el tamaño del cambio la requiere)
→ implementación del alcance acordado
→ validación (tests + graphify update .)
→ informe
```

El informe final debe incluir:

* archivos modificados;
* comportamiento implementado;
* pruebas realizadas;
* resultados de validación;
* pendientes;
* hallazgos no relacionados que deban documentarse.

Cuando el cambio requiera aprobación (mediano o grande), no implementar hasta recibirla explícitamente.
