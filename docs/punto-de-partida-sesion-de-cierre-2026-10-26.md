# ALNEXT · Punto de partida (sesión de cierre 26/10/2026)

Continúa el informe del 25/10. Este documento resume lo hecho el 26/10, el estado de la Fase 3 del plan de corrección del motor de clases (`docs/plan-correccion-motor-clases-2026-10-22.md`) y cómo retomar.

## 1. Estado general

- **Fase 3 (reconciliación): terminada y validada**, en código, tests automáticos y prueba manual con la copia de Ceferino.
- Rama de trabajo: `fix/motor-clases-fase-3`, head `3b60c87`, pusheada. Nada fusionado todavía.
- Pila de ramas (lineal): `feature/instalador-alnext` (0e85d77) > `fix/motor-clases-fase-1` (27d26bc) > `fix/motor-clases-fase-2` (452a771) > `fix/motor-clases-fase-3` (3b60c87). Tag `respaldo-fase1-ok`. Orden de fusión: 1, 2, 3, después de la validación final.
- Si `git push` falla con `HTTP2 framing layer`: `git -c http.version=HTTP/1.1 push`.

## 2. Qué se hizo hoy

1. **3c cerrada** (UI mínima, rutas con `desde` y confirmaciones, atajos legados retirados). Corrida de impacto del 26/10 sobre la copia de Ceferino: 56 cambios, todos explicados (27 por paso del tiempo del 23/10, 27 del 26/10 y 2 por la asignación 43, que son correcciones). Sin transiciones destructivas.
2. **Prueba manual del enroque de 2do A** (asignaciones 21 Matemática y 19 Inglés) sobre la copia de Ceferino. Encontró un hallazgo real (ver sección 4) que se corrigió y se repitió desde cero.
3. **Corrección del hallazgo 1** en cuatro commits, más un test extra.

### Commits de hoy (sobre fase-3)

| Commit | Contenido |
|---|---|
| `2905e96` | Motor: `rigeEn` reemplaza a `rigeAntesDeLaBaja`. Una baja sigue rigiendo para las clases que ya habían terminado en ese momento. `obtenerCondicionesVigentes` y `resolverClase` aceptan `ahora` opcional. Cambian los tests B5 y C2 (con su porqué en el mensaje). |
| `9855988` | Reconciliación: un único "ahora" por operación; con `desde >= hoy` y sin `reescribirDictadas`, las clases de hoy ya terminadas no se re-resuelven (solo PROGRAMADA pasa a DICTADA) ni se generan (filtro antes de crear, vía `generarParaRango(..., { ahora, omitirTerminadas })`). Las bajas de asignación y distribución responden 409 con el aviso en vez de 500. 6 tests nuevos (`terminadasDeHoy`) y 2 de rutas. |
| `535add3` | UI de Editar: manda `confirmarAnulacion`/`reescribirPasado` solo si el aviso los traía; si la versión empieza hoy o después, el modal muestra una sola línea sin opciones. |
| `9dbbe89` | UI de bajas: `mensajeErrorBaja` (helper puro, con test) muestra "No se aplicó la baja: cambiaría N clases ya dictadas (…)" en los tres lugares de baja. |
| `3b60c87` | Solo test: "Editar" sin `desde` en una versión que empieza en el futuro rige desde el inicio de la versión y no crea clases anteriores. |

### Resultado de tests (en 9dbbe89 y 3b60c87)

- Sin servidor: 198 pasan, 2 se saltean, 0 fallan (23 archivos); `asignarModulos` quedó en 6 de 6 con el test de 3b60c87.
- Suites HTTP contra el servidor propio (3100, `gestor_test`): 42 fallos, los mismos 42 de `docs/suites-comparacion-http.md`, uno por uno por nombre. Ninguno nuevo ni corregido. `rutasReconciliacion`: 5 de 5.
- Build limpio.

## 3. Prueba manual en la copia de Ceferino (todo coincidió con lo esperado)

Foto de partida: la clase 822 (Matemática, lunes 26/10, módulo 7, ya terminada) estaba en `PROGRAMADA`, el caso silencioso que el control diario todavía no había marcado.

**Matemática (asig 21)**: "Nueva versión" desde 26/10, "Editar" (quitar lunes 11:55, agregar viernes 11:55).
- Modal: una sola línea "Rige desde el inicio de la versión, 26/10/2026"; no apareció "Cambia el pasado".
- Clase 822: `DICTADA/NINGUNA`. Resto del módulo 7: 9 `SUSPENDIDA/CAMBIO_DISTRIBUCION` (incluye el feriado). Módulo 39 nuevo: 8 `PROGRAMADA` y 1 `SUSPENDIDA/CALENDARIO_ESCOLAR`. Módulos 13, 14, 25 y 26 intactos (la licencia del 27/10 conserva su `REEMPLAZADA`).

**Inglés (asig 19)**, sin "Mantener suplente": "Nueva versión" desde 26/10, "Editar" (quitar viernes 11:55, agregar lunes 11:55).
- Modal: pidió confirmar solo la anulación de 9 reemplazos (viernes 30/10 al 25/12, Lelli, Laura). "Mantener suplente" viene **destildada** por defecto.
- Módulo 7 (lunes nuevo): 9 `SUSPENDIDA/INCIDENCIA` (lunes del 02/11 al 28/12; la del 26/10 no se crea porque ya terminó; el período operativo llega al 31/12). Módulos 37 y 38 intactos. Módulo 39: 9 `SUSPENDIDA/CAMBIO_DISTRIBUCION`, con 9 reemplazos anulados y 18 activos.
- El pasado quedó intacto (clases anteriores al 26/10 sin cambios; versión 1 cerrada el 25/10, versión 2 activa desde el 26/10).

**Inglés con "Mantener suplente" tildada** (copia restaurada a limpia antes): módulo 7 con 9 `REEMPLAZADA/INCIDENCIA` y 9 reemplazos activos de Lelli, Laura; módulos 37 y 38 con 9 y 9; módulo 39 con 9 `CAMBIO_DISTRIBUCION` y 9 reemplazos anulados.

## 4. Hallazgos

- **Hallazgo 1 (resuelto)**: "Editar" con "Desde hoy" reescribía una clase ya dictada hoy (pedía confirmación "Cambia el pasado"). Además, una clase de hoy ya terminada pero todavía `PROGRAMADA` pasaba a `CAMBIO_DISTRIBUCION` sin aviso, las bajas del mismo día lanzaban un 500 al tocar una clase dictada, y el modal de confirmación mandaba siempre `reescribirPasado`. Corregido en 2905e96, 9855988 y 535add3.
- **Hallazgo 2 (resuelto)**: "Mantener el suplente" viene destildada por defecto (opt-in).
- **Hallazgo 3 (nuevo, Fase 6)**: el buscador de `/protected/dashboard/distribuciones` solo busca por identificador y agente ("Buscar por identificador o agente…"); no encuentra por unidad, materia o comisión (ej. "Aula 1"), que el listado ya muestra desde #153. Además el encabezado dice "75 distribuciónes" (acento de más).
- **Errores de proceso de hoy**: (a) la app de desarrollo no entraba porque se levantó con `<usuario>:<clave>` literal en `DATABASE_URL` (marcador que yo había dejado en el comando); el login daba 500 "Error en login" y la causa real solo se veía en la terminal de `npm run dev` (Prisma: credenciales inválidas en `resolveTenant`). Lección: el `catch` del login tapa la causa; conviene que registre el error original (candidato a Fase 6). (b) Hubo una instancia previa de `next dev` sin parar (puerto 3000 ocupado, lock de `.next/dev`): parar con `pkill -f "next dev"` antes de relanzar.

## 5. Notas de UX para la Fase 6

- "Nueva versión" debería llevar directo a editar los módulos de la versión nueva.
- Mejorar el texto del modal sobre suspensión y reemplazos; formato de fecha del selector (mm/dd/aaaa en el navegador); explicar por qué está deshabilitado "Confirmar nueva versión".
- Buscador de Distribuciones por unidad, materia y comisión; corregir "distribuciónes".
- Login: registrar el error original en el `catch` (sin exponer credenciales).
- Enroques provisorios con retorno automático (ya estaba en el plan).

## 6. Cómo retomar

1. La copia local debe estar limpia. Si se tocó: parar la app, `DROP DATABASE alnext_ceferino WITH (FORCE)`, `CREATE DATABASE alnext_ceferino`, `pg_restore --no-owner --no-acl ~/datos_ceferino/base_copia_limpia.dump`. Controles esperados: 2404 clases, 78 asignaciones, 43 incidencias, 465 reemplazos, 79 distribuciones.
2. Levantar la app de desarrollo contra la copia (solo si hace falta): `DATABASE_URL` con las credenciales locales reales (usuario y clave de `psql`), `DEV_TENANT_DOMAIN=""`, puerto 3000. El único usuario de la copia es el de Ceferino (`secretaria3164@…`); su clave es la del sistema de Ceferino.
3. **Fase 4 (licencias)** en `fix/motor-clases-fase-4`, creada desde `fix/motor-clases-fase-3`: diagnóstico y plan primero. Alcance: índice único parcial (migración SQL, el único cambio de schema del plan; decidir cómo probarla en la copia), ancestros en actualizar/reactivar licencia, edición y eliminación con reemplazos, `agenteAusenteId`, y el 500 de la licencia hija que empieza el mismo día que la padre.
4. Luego Fase 5 (reportes de ausencias), Fase 6 (UX/deuda), Fase 7 (despliegue: repetir `impacto-motor` con copia fresca, reparar datos de la asignación 43, backup, migraciones, paquete v5, actualización de Ceferino con el procedimiento validado, repetir la comparación de suites HTTP).

## 7. Pendientes abiertos

- Antes de fusionar ramas: decidir fecha y orden de fusión (1, 2, 3); repetir la comparación de suites en la rama resultante.
- El control diario de `withContext` corre una vez por día (una clase de hoy ya terminada puede seguir en `PROGRAMADA` hasta la primera petición del día siguiente; la reconciliación ya lo cubre en los cambios de distribución).
- `tests/helpers/auth.ts` no verifica la base del servidor; `crearReemplazo` no valida un `incidenciaId` explícito distinto del de la clase; doble lectura de la clase por resolución; `validarSuperposicionSuplente` importado desde `reconciliacionService` (deuda de capas).
- Seguridad: quitar el log de la URL de la base (`lib/prisma.ts`, líneas "DB USADA", #281); rotar la contraseña de la base de Ceferino (`alnext_app`, expuesta en el chat) y la del usuario `admin` local presente en docs viejos del repo; #205, #206, #207, #217 antes de cargar datos reales.
- Verificar `Intl` con zonas horarias en el Node portable de la instalación (`C:\ALNEXT\node`; el comando de verificación debe mostrar 20:59).
- Paquetes v4/v5; Ceferino Parte B; tareas #167–#173, #189, #191, #247, #278–#280; normativa sobre días que suspenden clases; renombrar el snapshot de VirtualBox.
- Reglas operativas en Ceferino hasta el despliegue: no guardar licencias en asignaciones con cambios de distribución; no usar "Editar" para enroques provisorios; correr el control de consistencia tras cambios grandes y hacer backup antes.

## 8. Reglas de trabajo vigentes

- Verificar, no asumir. Leandro corre los comandos y pega solo la salida del último.
- No pegar líneas con contraseñas ni `DATABASE_URL` con credenciales; no escribir credenciales en docs del repo; `config/institucion-demo.json` no se commitea.
- Datos reales de Ceferino fuera del repo y nunca en GitHub; no apuntar nunca la app de desarrollo a la base viva del piloto, solo a la copia local.
- Tests HTTP únicamente contra el servidor propio `NODE_ENV=test` en el puerto 3100 con `gestor_test`; nunca el 3000 ni `alnext_ceferino`. Claude Code no se conecta a `alnext_ceferino` salvo por el script de solo lectura `scripts/impacto-motor.ts` que corre Leandro.
- Commits chicos y separados, con tests y build tras cada uno; los cambios que modifican tests existentes se muestran antes de aplicar.
- Verificar el SHA256 tras expulsar y reinsertar el pendrive.