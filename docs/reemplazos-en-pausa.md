# Reemplazos en pausa (Fase 4, B)

Código: `lib/helpers/reemplazoPausado.ts` (`REEMPLAZO_PAUSADO`, `esPausado`, `pausarReemplazosDeOtrasLicencias`, `reanudarEnClases`).

## Semántica

Un reemplazo **en pausa** tiene `activo = false` y `deletedAt = NULL`. Todas las demás desactivaciones (Quitar, reasignar, anulación de la reconciliación) ponen `deletedAt`: esas son bajas.

Licencias encadenadas: X está de licencia (padre) y Lelli lo reemplaza. Lelli falta el día D, así que se carga una licencia hija y la clase de D pasa a la hija.

- Al crear, reactivar o ampliar la hija, el reemplazo de Lelli en D queda **en pausa**. Lelli sigue reemplazando a X ese día, y la padre la muestra así, pero no cubre la clase.
- Quien cubre a Lelli en D es el reemplazo de la hija. Si no hay ninguno, la clase queda `SUSPENDIDA`.
- Al eliminar la hija o achicar su rango, las clases vuelven a la padre y se **reanuda** el pausado de la padre. Solo pasa si la clase sigue viva (ni `FIN_ASIGNACION` ni `CAMBIO_DISTRIBUCION`) y no tiene otro reemplazo activo.
- Con tres niveles (abuela, hija, nieta), cada nivel pausa y reanuda el reemplazo del nivel de arriba.

Un pausado **no** cuenta como cobertura. El motor, el Dashboard, los conteos y los reportes cuentan solo `activo = true`. Tampoco cuenta como clase dada por el suplente: el reporte del profesor lo excluye.

## Límite conocido (sin implementar)

Si la reconciliación (Fase 3) crea una clase nueva dentro del rango de una hija con "mantener suplente", la cubre el suplente de la hija, pero no se crea el pausado de la padre. En ese día, la padre se muestra sin su reemplazante.

## Datos anteriores a la Fase 4 (reparo para la Fase 7)

Con el modelo viejo, "Ausencia del suplente" desactivaba el reemplazo de la padre **con** `deletedAt`, igual que un "Quitar". Por eso:

- Al eliminar una de esas hijas, el reemplazo de la padre no se reanuda.
- Las hijas creadas sin suplente nuevo dejaron el reemplazo de la padre activo, y sus clases figuran `REEMPLAZADA` por el ausente.

Propuesta:

1. **Script de solo lectura** sobre la copia, que liste:
   - **Pausas seguras:** reemplazo con `incidenciaId = P`, `activo = false` y `deletedAt` puesto, en una clase cuya licencia actual es una hija viva H de P, y con `deletedAt` a menos de 5 s del `createdAt` del reemplazo de H en esa clase. Es la huella de `reasignarReemplazoAIncidencia`, que hace las dos cosas en una sola transacción.
   - **Dudosos:** lo mismo sin la coincidencia de tiempo. Pudo ser un "Quitar" manual: se revisan a mano.
   - **Hijas sin cobertura:** reemplazo de la padre todavía activo en clases de una hija viva.
2. **Reparo**, con backup previo y solo sobre lo aprobado:
   - En las pausas seguras, poner `deletedAt = NULL`.
   - En las hijas sin cobertura, pausar el reemplazo y re-resolver las clases, que pasan a `SUSPENDIDA`. Lo controla `scripts/impacto-motor.ts`.
