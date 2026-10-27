# Migraciones con SQL que Prisma no expresa

## `Incidencia_unica_viva_key` (migración `20261027120000_incidencia_unica_viva`, Fase 4)

Índice único parcial sobre `Incidencia`:

```sql
CREATE UNIQUE INDEX "Incidencia_unica_viva_key"
  ON "Incidencia" ("asignacionId", COALESCE("incidenciaPadreId", 0), "fecha_desde")
  WHERE "deletedAt" IS NULL;
```

Reemplaza al `@@unique([asignacionId, fecha_desde])`. Permite recargar una licencia con la misma fecha de inicio que una eliminada, y que una hija empiece el mismo día que su padre. Entre licencias vivas del mismo padre (o entre raíces) la fecha de inicio sigue siendo única. La superposición de fechas la sigue controlando `verificarSuperposicion`. El índice es la red de seguridad ante carreras. Un `P2002` se informa como `IncidenciaDuplicadaError` (409).

- Prisma no representa índices parciales ni por expresión, así que el índice no figura en `schema.prisma`.
- **Un `prisma migrate dev` futuro va a generar un `DROP INDEX "Incidencia_unica_viva_key"`.** Hay que borrar esa línea de la migración generada antes de aplicarla.
- `prisma migrate deploy` y `prisma migrate status` no comparan contra el schema. El instalador (`installer/Install-Database.ps1`) y `tests/checkMigraciones.test.ts` (que corre los dos contra `gestor_test`) no se ven afectados. `checkMigraciones` verifica que la migración esté aplicada y sin pendientes, pero no la forma del índice. La forma la prueban `tests/licencias.test.ts`.
- Control previo en una base existente (solo lectura, tiene que dar 0 filas):

```sql
SELECT "asignacionId", COALESCE("incidenciaPadreId",0), fecha_desde, count(*)
FROM "Incidencia" WHERE "deletedAt" IS NULL GROUP BY 1,2,3 HAVING count(*) > 1;
```

- Rollback: está en el comentario de la migración. Falla si ya existen filas que solo el índice nuevo admite.
