# ALNEXT — Punto de partida / cierre de sesión 12/09/2026

## Resumen del día

Continuación directa de la sesión del 11/09, que había cerrado justo antes de abordar el instalador único, dejando pendiente primero implementar el control de licencia (#204 llevado a la práctica). Hoy se diseñó, implementó, depuró y validó de punta a punta el mecanismo real de suspensión de servicio por falta de pago, y se tomaron una serie de decisiones de negocio necesarias para sostenerlo. El instalador único (#222) sigue pendiente, pero ya no tiene bloqueadores.

## Hecho hoy

1. **Decisiones de negocio sobre el control de licencia:**
   - Confirmado: **Colegio Ceferino es la primera escuela piloto real** (no una ambigüedad de tarea #11 — ver cierre del 11/09).
   - Mecanismo de enforcement elegido: **"Control manual simple"** — un booleano (`activo`) que el proveedor cambia a mano, sin lógica automática de fechas/vencimientos. Decisión explícita para no arriesgar la confiabilidad del sistema durante el piloto (un bug en un enforcement automático podría sabotear justo la señal que el piloto está midiendo).
   - Acceso remoto para operar ese control sin depender de la cooperación del cliente: se evaluaron Tailscale, ZeroTier, Cloudflare Tunnel y SSH reverse tunnel; se eligió **Tailscale** (plan Free, hasta 6 usuarios y dispositivos ilimitados, suficiente indefinidamente para este caso de uso). Cuenta creada (`leandroa.alegre@gmail.com`), confirmada activa en el admin console.
   - Pendiente de decisión de negocio real (no técnica): precio del piloto. Se discutió cobrar desde el día 1 a instituciones nuevas (~$70.000/mes mencionado como referencia), con la recomendación de evaluar una tarifa de piloto con descuento en vez de precio completo o gratuidad. Sin resolver formalmente — decisión que le corresponde al usuario, no a mí.
   - Se marcó como pendiente, fuera del alcance de código: redactar un **acuerdo escrito con el cliente** que cubra consentimiento explícito para el acceso remoto y la suspensión por falta de pago. Recomendado consultar a un abogado antes de instalar nada en la máquina de un cliente real.

2. **Implementado el chequeo de `institucion.activo`**, primero en `lib/auth/withContext.ts` (con parámetro `exentoDeLicencia` para las 8 rutas de reportes) y extendido el frontend (`useAuth.ts`, `login/page.tsx`) para detectar `code: "LICENCIA_INACTIVA"` en un 403 y mostrar un mensaje claro.

3. **Descubierto un mecanismo de licencia preexistente y desconocido en `proxy.ts`** (el middleware real de Next.js, matcher `/api/:path*`, corre antes que cualquier route handler): ya bloqueaba instituciones inactivas/suspendidas con un 403 genérico, sin allowlist y sin el campo `code`. Esto volvía **inefectivo todo lo implementado en el punto 2** — `withContext` nunca llegaba a ejecutarse para una institución bloqueada, porque `proxy.ts` cortaba el request antes.

4. **Reconciliado el mecanismo, consolidando `proxy.ts` como única fuente de verdad** (commit `f39c68d`):
   - `proxy.ts`: agrega una allowlist de rutas de reportes (siempre exentas, cualquier método) y de endpoints de soporte compartidos —`agentes`, `comisiones`, `codigarios`, `periodos-operativos`— exentos **solo en GET**, para que los reportes puedan poblar sus filtros sin habilitar gestión académica plena (crear/editar/borrar) durante la suspensión. Agrega `code: "LICENCIA_INACTIVA"` a la respuesta 403.
   - `withContext.ts`: revertido el chequeo agregado en el punto 2 (quedaba muerto, duplicaba una query innecesaria). Comentario actualizado para reflejar que el control vive en `proxy.ts`.
   - Las 8 rutas de reportes: revertido el `exentoDeLicencia` (sin efecto real una vez que la exención vive en `proxy.ts` por pathname).
   - `login/route.ts`: mismo mensaje claro de suspensión + `code`, por consistencia.
   - `useAuth.ts` / `login/page.tsx`: sin cambios funcionales adicionales a los del punto 2 — ya estaban bien diseñados, solo necesitaban que el backend real (`proxy.ts`) mandara el `code` correcto.

5. **Validado en vivo, con la institución de prueba (`Escuela Primaria N°12`) inactivada y sesión ya iniciada:**
   - Pantallas protegidas no exentas (Agentes, Dashboard): bloquean y redirigen a login con el mensaje de suspensión.
   - Los 8 reportes (Ausencias, Asignaciones, Codigarios, Horarios, Módulos computables, Jornadas, Ficha de profesor, Listado de profesores): cargan con normalidad pese a la institución inactiva.
   - Login con institución inactiva: bloquea con el mensaje claro, no dejando entrar.
   - Escritura sobre endpoints de soporte con GET exento (ej. editar un agente): sigue bloqueada — confirmado que el diseño method-aware funciona como corresponde, sin abrir una puerta trasera de gestión.
   - Institución reactivada al final de cada prueba; estado final: `activo = true`, funcionamiento normal confirmado.

6. **Depuración del propio proceso de edición remota:** dos errores propios corregidos durante el revert de `withContext.ts` y las 8 rutas de reportes (un `perl` con grupo de captura que se comía el `)` de cierre de `withContext(...)`, corregido recién en el tercer intento). Sin impacto en el resultado final, pero señal tomada en cuenta para la decisión de cierre (ver abajo).

## Decisión de cierre de sesión

Con el control de licencia resuelto, el bloqueador formal de la tarea #222 (instalador único) ya no existe. Aun así, se evaluó honestamente seguir directo con el instalador y se decidió **no hacerlo hoy**: es la pieza de mayor riesgo y complejidad de todo el bloque (corre una sola vez, sin supervisión paso a paso, en la máquina real de una escuela), la sesión ya tuvo un ciclo de debugging propio con un par de errores evitables, y no hay ninguna fecha de instalación real que lo urja. Mejor abordarlo en una sesión nueva, con atención completa desde el principio — mismo criterio que cerró la sesión del 11/09.

## Pendiente (orden sugerido al retomar)

1. **Construir el instalador único** (`.ps1` que encadene: instalación y login de Tailscale, Postgres nativo, Node, clonar repo, `npm install`, `prisma migrate deploy`, `seed-instalacion.ts` con `config/institucion.json`, y registro de Task Scheduler para backup automático). Ya no depende de nada de código — todas las piezas individuales están validadas por separado.
2. Cargar los datos reales de Colegio Ceferino (institución real + admin real + los 109 porcentajes de codigario) vía el mecanismo ya construido — sin apuro, cuando se acerque la instalación real (tarea #11).
3. Definir el precio real del piloto (decisión de negocio, no técnica) y, en paralelo, redactar el acuerdo escrito con el cliente que cubra consentimiento de acceso remoto y suspensión por falta de pago — recomendado consultar a un abogado antes de instalar nada en una máquina real.
4. Generar el authkey de Tailscale para el instalador cuando se llegue a esa etapa (lo genera y usa el usuario directamente, nunca compartido conmigo — mismo criterio que `config/institucion.json`).
5. Resto del backlog sin tocar en estas sesiones: tarea #167-173 (45 tests desactualizados), #189, #191, #204 (ya en marcha, ver este documento), #205-217 (hallazgos UX-ADM restantes), dos `.sql` sueltos en la raíz del repo, cosmético del nombre de `docs/ Verdades del entorno — ALNEXT.md`.

## Estado del repo al cierre

Todo commiteado y pusheado a `develop`. Commit relevante de hoy: `f39c68d` ("Consolidar control de licencia en proxy.ts (único punto de verdad)"), sobre el último commit del 11/09 (`242df2d`). Sin cambios sin commitear, sin ramas sueltas. Institución de prueba (`Escuela Primaria N°12`) confirmada `activo = true` al cierre.
