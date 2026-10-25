# impacto-motor.ts

Script de **solo lectura**. Mide cuántas `ClaseProgramada` cambiarían de estado/causa si se volvieran a resolver con el motor actual (`obtenerCondicionesVigentes` + `resolverEstadoYCausa`), comparando contra lo guardado. No llama a `resolverClase` y no escribe nada.

No forma parte de los tests ni del build (`next build` solo lo revisa con TypeScript, como al resto de `scripts/`).

## Garantías

- La URL se arma dentro del script con `default_transaction_read_only=on` (y una sola conexión). Si `SHOW transaction_read_only` no da `on`, el script aborta antes de leer clases.
- Solo acepta las bases `alnext_ceferino` (copia local restaurada, nunca el piloto) y `gestor_test`.
- Nunca imprime la URL ni la contraseña; solo el nombre de la base.
- Aborta con `NODE_ENV=test` (en ese caso `lib/prisma.ts` cargaría `.env.test`).

## Cómo correrlo

```bash
IMPACTO_DATABASE_URL="postgresql://USUARIO:CLAVE@localhost:5433/alnext_ceferino" \
JITI_ALIAS='{"@/":"'"$PWD"'/"}' \
node_modules/.bin/jiti scripts/impacto-motor.ts
```

`IMPACTO_DATABASE_URL` va **sin** parámetros (`?schema=...`): si los trae, el script los descarta y pone los suyos. Se corre desde la raíz del repo. `jiti` viene instalado como dependencia transitiva; si desaparece, sirve cualquier runner de TypeScript que resuelva el alias `@/`.

## Salida

- Encabezado: base, confirmación de solo lectura, fecha y hora de referencia (el motor usa el "hoy" real de la institución), total de clases y cuántas cambiarían.
- Dos tablas, una para las no DICTADA y otra para las DICTADA: `estado/causa guardado -> estado/causa nuevo` con conteos, incluidas las que no cambian.
- Hasta 20 ejemplos por cada transición con cambio: id de clase, asignación, fecha y módulo (`jornal` si no tiene).

No compara `calendarioEscolarId`, solo estado y causa.
