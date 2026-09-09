# Auditoría UX Funcional y Operativa — Módulo Institución, agentes y acceso

## 1. Resumen ejecutivo

El módulo cubre tres áreas con madurez muy distinta:

- **Agentes** (`/protected/dashboard/agentes`) es la única pantalla real de este módulo. Está bien construida en lo funcional: valida campos requeridos, distingue error de red vs. error de negocio, muestra mensajes del backend tal cual, deshabilita "Eliminar" cuando corresponde con motivo visible, y el ciclo crear/editar/eliminar/reactivar funciona de punta a punta (verificado en vivo). El hallazgo más importante ahí es de **mensaje incorrecto**: el modal de borrado dice que la acción "no se puede deshacer" cuando en realidad es reversible (soft delete + botón "Reactivar" en la misma pantalla).
- **"Mi institución"** (los datos que aparecen en los headers de los PDF) tiene backend completo (`GET`/`PATCH /api/mi-institucion`) pero **no existe ninguna pantalla que lo use**. No hay forma de editar dirección, teléfono, email o CUIT de la institución desde la interfaz.
- **Acceso** (login, sesión, tenant, roles) es donde aparecen los hallazgos más graves. Confirmado en vivo contra el tenant de prueba **Escuela Primaria N°12** (id=1):
  - Cualquier usuario autenticado, sin importar su rol, puede crear usuarios con rol ADMIN y **auto-promoverse a ADMIN** vía `/api/usuarios` — no hay ninguna verificación de autorización en esos endpoints.
  - Quitarle a un usuario su único rol en una institución (la única forma de "desactivarlo" que existe en el sistema) **no invalida su sesión activa**: sigue teniendo acceso completo a la API hasta que expire (7 días) o alguien cierre sesión manualmente.
  - `GET /api/instituciones` es público (sin autenticación) y devuelve nombre, dominio, email y teléfono de **todas** las instituciones de la plataforma, incluyendo tenants de otro rubro (ej. "Sanatorio del Sur").
  - No existe ningún mecanismo de recuperación de contraseña: el link del login es un enlace muerto (404) y no hay, ni siquiera para un admin, forma de resetear la contraseña de otro usuario.

El aislamiento multi-tenant propiamente dicho (que un usuario de una institución no vea datos de otra) **funciona correctamente y fue confirmado en vivo**: intentar mezclar token de un tenant con `x-tenant-id` de otro devuelve `403 {"error":"No autorizado para este tenant"}`, y acceder a un recurso de otro tenant por id devuelve `404` limpio, no una lista vacía silenciosa ni un 500.

Esto conecta directamente con un punto que la auditoría del Dashboard (`docs/auditoria-ux-dashboard-2026-09-06.md`, sección 9) dejó como **"RIESGO / NO CONFIRMADO"**: *"no se encontró en el código del Dashboard ninguna lógica de visibilidad condicionada por rol... no se pudo determinar si esto es intencional o un vacío de permisos, porque `withContext` está fuera del alcance de ese módulo"*. Esta auditoría confirma que **no es específico del Dashboard**: `withContext` y el proxy (`proxy.ts`) no conocen el concepto de rol en ningún punto del sistema — la ausencia de control de roles es transversal a toda la aplicación, no un vacío puntual.

## 2. Rama y commit auditado; acceso a navegador

- Rama: `develop`
- Commit: `351cc977f70e06e7fb1ad8b63f78a6d128d9eef1`
- **Acceso:** No se usó navegador/DevTools interactivo (no hay herramienta de automatización de browser disponible en este entorno). **Sí hubo acceso al servidor de desarrollo** (`next dev`, puerto 3000, responde 200), y se usó para pruebas en vivo por API (`curl`) contra el tenant de prueba **Escuela Primaria N°12** (`institucionId=1`, usuario `admin@escuela12.edu.ar` / `password123`, credenciales del seed del proyecto) y, para probar aislamiento, contra **Sanatorio del Sur** (`institucionId=2`, `admin@sanatoriosur.com.ar`).
  - Los hallazgos de backend/API están marcados **"Fuente: prueba en vivo (API)"**.
  - Los hallazgos que dependen de renderizado real en pantalla (estilos, foco, lectura de un screen reader) están marcados **"Fuente: código (inferido)"**, ya que no se pudo interactuar con el DOM/navegador real.
- **Datos de prueba generados** (en el tenant Escuela Primaria N°12, `institucionId=1`) y su estado final:
  - Agente `AuditoriaUX Prueba` (documento `AUDIT-UX-99999`, id=10): creado, verificado duplicado/soft-delete/reactivación, **eliminado (soft delete) al cierre** de la prueba.
  - Usuario `auditoria-ux-test-docente@escuela12.edu.ar` (id=5) y `auditoria-ux-test-admin-fantasma@escuela12.edu.ar` (id=6): creados para probar la escalación de privilegios (hallazgo UX-ADM-001). Se les quitó el rol asignado (`DELETE /api/usuarios`) al cerrar la prueba, pero **el registro `Usuario` en sí no se pudo borrar** porque no existe un endpoint para eliminarlo — quedan como cuentas sin rol asignado en ninguna institución (no pueden iniciar sesión operativamente porque `iniciarSesion` exige `roles.length > 0`, pero el registro persiste en la tabla `Usuario`).
  - Usuario `auditoria-ux-revocacion@escuela12.edu.ar` (id=7): creado para probar la revocación de sesión (hallazgo UX-ADM-002). Mismo estado final: sin rol, registro `Usuario` persistente.
  - Todas las sesiones/tokens de prueba fueron cerradas explícitamente (`POST /api/auth/logout`) al finalizar.

## 3. Alcance auditado (rutas confirmadas en el repo)

| Ruta | Tipo | Página UI | Notas |
|---|---|---|---|
| `/public/login` | Página | `app/public/login/page.tsx` | Única pantalla pública del módulo |
| `POST /api/auth/login` | API | — | `lib/usecases/auth/iniciarSesion.ts` |
| `POST /api/auth/logout` | API | — | `lib/usecases/auth/cerrarSesion.ts` |
| `proxy.ts` (middleware, matcher `/api/:path*`) | Middleware | — | Resuelve tenant + valida sesión, inyecta `x-user-id`/`x-tenant-id` |
| `/protected/dashboard/agentes` | Página | `app/protected/dashboard/agentes/page.tsx` | CRUD completo de agentes (docentes/personal) |
| `GET/POST /api/agentes`, `GET/PATCH/DELETE /api/agentes/[id]`, `POST /api/agentes/[id]/reactivar` | API | — | Consumidas por la página de arriba |
| `GET/PATCH /api/mi-institucion` | API | **ninguna** | Sin pantalla que lo consuma — confirmado (grep + 404 en ruta esperada) |
| `GET/POST /api/instituciones` | API | **ninguna** | Alta de instituciones (superadmin) — sin pantalla; `GET` es público |
| `GET/POST/PATCH/DELETE /api/usuarios` | API | **ninguna** | Gestión de usuarios del sistema y sus roles por institución — sin pantalla, sin control de rol del que llama |

No se encontró ninguna pantalla de selección/cambio de institución, ni de "Mi institución", ni de gestión de usuarios/roles del sistema — pese a que el modelo de datos (`Usuario`, `Rol`, `UsuarioRol`, `Institucion`) las soporta plenamente. Esto se detalla en los hallazgos.

Quedan fuera de este módulo (auditados o a auditar por separado): reportes/PDF (`docs/auditoria-ux-reportes-2026-09-08.md`), dashboard (`docs/auditoria-ux-dashboard-2026-09-06.md`), incidencias, asignaciones, etc. — aunque todos comparten la capa `withContext`/`proxy.ts` auditada acá.

## 4. Inventario de pantallas

### 4.1 Login (`app/public/login/page.tsx`)
- **Objetivo:** autenticar al usuario contra un tenant ya resuelto por subdominio/header.
- **Rol esperado:** cualquiera con cuenta activa en el tenant.
- **Campos:** email, password. Validación de formato de email y de campos no vacíos en cliente antes de enviar.
- **Acciones:** "Ingresar" (submit, también con Enter), link "¿Olvidaste tu contraseña?".
- **Estados:** loading (botón deshabilitado, texto "Ingresando..."), error (banner rojo con `role="alert"`, se limpia al tipear), sin estado "vacío" (n/a).
- **Navegación posterior:** éxito → `router.push("/protected/dashboard")`, guarda token en `sessionStorage`.
- **No selecciona institución**: el tenant viene resuelto antes de llegar a esta pantalla (subdominio o `x-tenant-id`/`x-institucion-id`, con fallback a `DEV_TENANT_DOMAIN` en desarrollo). No hay selector de institución en la UI en ningún punto del flujo.

### 4.2 Agentes (`app/protected/dashboard/agentes/page.tsx`)
- **Objetivo:** ABM de agentes (personal/docentes) de la institución actual.
- **Rol esperado:** cualquier usuario autenticado del tenant — **no hay diferenciación por rol** (ver UX-ADM-001/hallazgos de acceso).
- **Acciones:** buscar (nombre/apellido/documento/email), checkbox "Ver inactivos", "+ Nuevo agente", por fila: menú "Gestionar ▾" → Editar / Eliminar (deshabilitado con motivo si tiene asignaciones activas) / Reactivar (solo si está inactivo).
- **Formulario:** nombre, apellido, documento (requeridos), email, teléfono, domicilio (opcionales). Validación de requeridos en cliente; duplicado de documento validado en backend (409, mensaje claro).
- **Modales:** confirmación de eliminación (mensaje contiene un error de hecho, ver UX-ADM-005).
- **Estados:** loading inicial ("Cargando agentes..."), vacío ("No hay agentes activos registrados"), error (banner rojo dismisible), guardando (botón "Guardando..." deshabilitado).
- **Navegación:** sin sub-rutas; todo ocurre in-page (form inline, no modal para crear/editar).

### 4.3 "Mi institución" — **no existe como pantalla**
- Backend completo (`GET`/`PATCH /api/mi-institucion`, usado potencialmente para los headers de PDF vía `miInstitucionRepository`), pero cero referencias desde `app/` o `features/`, cero entrada en el `Sidebar`, y la ruta de página más obvia (`/protected/dashboard/mi-institucion`) devuelve 404 en vivo.

### 4.4 Instituciones (alta de tenants) — **no existe como pantalla**
- `GET /api/instituciones` (público) y `POST /api/instituciones` (requiere `esSuperAdmin`) no tienen ningún consumidor de UI. Es funcionalidad de back-office pura, operable hoy solo por API directa.

### 4.5 Usuarios y roles — **no existe como pantalla**
- `GET/POST/PATCH/DELETE /api/usuarios` (alta de usuarios del sistema, asignación/reasignación/baja de rol por institución) no tiene ningún consumidor de UI. Es la única forma que existe en el sistema de dar/quitar acceso a alguien, y hoy solo es alcanzable por API directa — lo cual, dado el hallazgo UX-ADM-001, es en la práctica alcanzable por **cualquier usuario ya logueado**, no solo por quien tiene acceso a Postman/DB.

## 5. Matriz de acciones críticas

| Pantalla | Acción | API / UseCase | Resultado esperado |
|---|---|---|---|
| Login | Iniciar sesión | `POST /api/auth/login` → `iniciarSesion` | 201 + token si credenciales válidas, activo, y con rol en el tenant; 401 con mensaje genérico si no |
| Sidebar (global) | Cerrar sesión | `POST /api/auth/logout` → `cerrarSesion` | Sesión eliminada en DB, token local borrado, redirect a login |
| Agentes | Crear agente | `POST /api/agentes` → `crearAgente` | 201 + agente creado; 400 si faltan campos; 409 si documento duplicado en el tenant |
| Agentes | Editar agente | `PATCH /api/agentes/[id]` → `actualizarAgente` | 200 + agente actualizado; 404 si no existe en el tenant; 409 si el nuevo documento ya existe |
| Agentes | Eliminar agente (soft delete) | `DELETE /api/agentes/[id]` → `eliminarAgente` | 200 `{ok:true}`; 409 si tiene asignaciones activas; **reversible** vía Reactivar |
| Agentes | Reactivar agente | `POST /api/agentes/[id]/reactivar` → `reactivarAgente` | 200 `{ok:true}`, agente vuelve a `activo:true` |
| Cualquier request `/api/*` | Resolver tenant + sesión | `proxy.ts` | 400 si no hay tenant resoluble; 403 si tenant inactivo/suspendido; 401 si no hay token o sesión inválida/expirada; 403 si el tenant de la sesión no coincide con el `x-tenant-id` del request |
| (sin pantalla) | Crear institución | `POST /api/instituciones` → `crearInstitucion` | 201 solo si `esSuperAdmin`; 401/403/400/409 según el caso |
| (sin pantalla) | Crear usuario + asignar rol | `POST /api/usuarios` | 201 — **sin ninguna verificación de que el que llama tenga permiso para crear usuarios ni para asignar ese rol** |
| (sin pantalla) | Reasignar rol de usuario | `PATCH /api/usuarios` | 200 — **sin verificación de permiso del que llama; un usuario puede reasignarse su propio rol** |
| (sin pantalla) | Quitar rol de usuario (única forma de "desactivar" acceso) | `DELETE /api/usuarios` | 200 — quita la fila `UsuarioRol`, pero **no invalida sesiones activas del usuario afectado** |

## 6. Hallazgos

### UX-ADM-001 — Cualquier usuario autenticado puede crear usuarios ADMIN y auto-promoverse (escalación de privilegios)
**Prioridad:** P0  **Tipo:** PERMISOS
**Fuente:** prueba en vivo (API), tenant Escuela Primaria N°12
**Pantalla:** ninguna (backend puro, `/api/usuarios`)
**Acción:** un usuario con rol DOCENTE llama `POST /api/usuarios` con `rolId: 1` (ADMIN), o `PATCH /api/usuarios` pidiendo cambiar su propio rol a ADMIN.
**Resultado esperado:** el sistema debería rechazar la operación (403) a menos que quien llama tenga un rol con permiso para gestionar usuarios/roles en esa institución.
**Resultado actual:** ambas operaciones devuelven 200/201 sin ninguna verificación de rol. Reproducido en vivo:
```
# usuario recién creado con rolId=3 (DOCENTE) llama:
POST /api/usuarios {rolId:1, email:"...admin-fantasma..."}  → HTTP 201 (crea un ADMIN nuevo)
PATCH /api/usuarios {usuarioId:5, rolId:3, nuevoRolId:1}     → HTTP 200 (se auto-asciende a ADMIN)
```
**Evidencia:** `app/api/usuarios/route.ts` líneas 8-32 (`GET`/`POST`) y 105-171 (`PATCH`) — todas envuelven la lógica en `withContext(req, async ({ tenantId }) => ...)` y usan únicamente `tenantId` para el `where`. No hay lectura de `rolId`/permiso del llamante en ningún punto (`RequestContext`, `lib/types/context.ts`, no incluye rol). Comparar con `lib/usecases/instituciones/crearInstitucion.ts:31-33`, que sí valida `sesion.usuario.esSuperAdmin` antes de dejar crear una institución — el mismo patrón no se replicó acá.
**Impacto para el usuario:** cualquier cuenta (incluso la de menor jerarquía) puede otorgarse a sí misma o a terceros el rol más alto del sistema dentro de su institución, sin dejar ningún rastro distinto de un alta de usuario normal. No requiere explotar un bug de tenant — ocurre dentro del propio tenant del atacante.
**Recomendación:** (no implementar) Definir qué rol(es) pueden gestionar usuarios/roles (ej. ADMIN/DIRECTIVO) y verificarlo en `POST`/`PATCH`/`DELETE /api/usuarios` antes de ejecutar la operación, de forma análoga a `esSuperAdmin` en `crearInstitucion`. Evaluar si esto amerita extender `RequestContext` para incluir el/los rol(es) del usuario autenticado, ya que hoy ningún endpoint de la aplicación puede condicionar comportamiento por rol.

### UX-ADM-002 — Quitarle el rol a un usuario no invalida su sesión activa
**Prioridad:** P0  **Tipo:** PERMISOS
**Fuente:** prueba en vivo (API), tenant Escuela Primaria N°12
**Pantalla:** ninguna (backend puro)
**Acción:** un admin ejecuta `DELETE /api/usuarios?usuarioId=X&rolId=Y` para quitarle a un usuario su (único) rol en la institución — la única acción de "baja de acceso" que existe en el sistema.
**Resultado esperado:** el usuario afectado debería perder acceso a la API de esa institución de inmediato (o, como mínimo, en la siguiente request significativa).
**Resultado actual:** la sesión (`token`) que el usuario ya tenía sigue funcionando exactamente igual después de la baja de rol. Reproducido en vivo:
```
DELETE /api/usuarios?usuarioId=7&rolId=3  → HTTP 200 {"ok":true}   (rol eliminado)
GET /api/agentes  (con el token viejo del usuario 7)  → HTTP 200   (sigue con acceso total)
```
**Evidencia:** `proxy.ts` líneas 54-77 — el middleware solo valida `sesion.expiresAt` y que `sesion.institucionId === tenantId`; nunca vuelve a consultar `UsuarioRol` ni el estado (`activo`/`estado`) del `Usuario`. `lib/usecases/auth/iniciarSesion.ts` sí valida `roles.length === 0` pero **solo al momento del login** — la sesión, una vez emitida, vive 7 días (`SESSION_DURATION_MS`) sin volver a chequearse contra el estado real del usuario/rol. Tampoco existe ningún endpoint para desactivar un `Usuario` (`activo`/`estado`) directamente — la única palanca de "baja de acceso" disponible en todo el código es esta, y no funciona de inmediato.
**Impacto para el usuario:** un administrador que revoca acceso a alguien (ej. tras la salida de un empleado, o para corregir el hallazgo UX-ADM-001) puede creer razonablemente que la persona quedó sin acceso, cuando en realidad conserva acceso completo hasta que su sesión expire (hasta 7 días) o alguien fuerce el logout de esa sesión puntual (que hoy tampoco hay forma de hacer desde la UI, solo el propio usuario puede cerrar su sesión).
**Recomendación:** (no implementar) Revalidar en cada request (o al menos cachear con TTL corto) que el usuario siga activo y con al menos un rol vigente en el tenant, no solo que la sesión no haya expirado; o invalidar explícitamente las sesiones del usuario al quitarle el último rol (`eliminarTodasLasSesiones` ya existe y se usa en logout `?all=true`, se podría reutilizar acá).

### UX-ADM-003 — `GET /api/instituciones` es público y expone datos de todas las instituciones de la plataforma
**Prioridad:** P1  **Tipo:** PERMISOS
**Fuente:** prueba en vivo (API)
**Pantalla:** ninguna
**Acción:** cualquiera, sin autenticación, llama `GET /api/instituciones`.
**Resultado esperado:** dado que devuelve datos de todos los tenants de la plataforma (no solo del tenant del que consulta), debería requerir al menos autenticación de superadmin, igual que `POST /api/instituciones`.
**Resultado actual:** responde 200 sin ningún header de autenticación, con el listado completo. Reproducido en vivo:
```
curl http://localhost:3000/api/instituciones
→ [{"id":1,"nombre":"Escuela Primaria N°12", "dominio":"escuela12.edu.ar","email":"info@escuela12.edu.ar","telefono":"0341-4100100"}, {"id":2,"nombre":"Sanatorio del Sur", ...}, {"id":3,"nombre":"Colegio Ceferino", ...}]
```
**Evidencia:** `proxy.ts` línea 16 excluye explícitamente `/api/instituciones` de la validación de tenant/sesión ("Rutas públicas"); `app/api/instituciones/route.ts` `GET` no aplica ningún chequeo adicional; `lib/usecases/instituciones/listarInstituciones.ts` no filtra por nada. Confirmado como intencional en el código de test (`tests/instituciones.test.ts:54-60`, sin headers de auth), pero no hay ningún consumidor de UI que lo use hoy (ver 4.4) — el diseño parece anticipar una futura pantalla de selección de institución que aún no existe.
**Impacto para el usuario:** expone nombre, dominio y datos de contacto de instituciones de rubros distintos (educativo y de salud, en los datos de prueba) a cualquiera con la URL, sin relación con ninguna pantalla real hoy. Bajo impacto operativo inmediato (no hay UI que lo use), pero es una superficie de exposición de datos de clientes de la plataforma sin necesidad funcional actual.
**Recomendación:** (no implementar) Si esta ruta existe para una futura pantalla de selección de institución en login, limitar la respuesta a los campos estrictamente necesarios para esa UI (hoy ya es un subconjunto razonable: id/nombre/dominio/email/teléfono) y evaluar si de verdad necesita ser pública o puede resolverse de otra forma (ej. autocomplete server-side sin exponer el listado completo). Si no hay plan de uso, retirarla de las rutas públicas del proxy.

### UX-ADM-004 — No existe pantalla de "Mi institución": los datos de los headers de PDF no se pueden editar desde la UI
**Prioridad:** P1  **Tipo:** FORMULARIO
**Fuente:** prueba en vivo (404 en ruta esperada) + código (grep sin resultados)
**Pantalla:** ausente — se buscó en `Sidebar.tsx` (sección "Configuración" y el resto), en `app/` y `features/`, y no aparece ninguna referencia a `mi-institucion`/`MiInstitucion` en ningún componente.
**Acción:** un usuario necesita corregir el domicilio, teléfono, email o CUIT de su institución (datos que se imprimen condicionalmente en el header de los PDF, ver `lib/pdf/generator.ts:135-144`).
**Resultado esperado:** una pantalla en "Configuración" del Sidebar, análoga a las demás (Módulos de Horarios, Distribuciones, etc.), que permita ver y editar estos datos.
**Resultado actual:** no existe ninguna pantalla. El backend (`GET`/`PATCH /api/mi-institucion`) está completo, testeado (`tests/mi-institucion.test.ts`) y funcional, pero sin consumidor. `curl http://localhost:3000/protected/dashboard/mi-institucion` → 404 en vivo.
**Evidencia:** `app/ui/components/layout/Sidebar.tsx` (secciones `MAIN_ITEMS`/`ACADEMIC_ITEMS`/`REPORT_ITEMS`/`CONFIG_ITEMS`, ninguna referencia); `app/api/mi-institucion/route.ts` completo y sin consumidor.
**Impacto para el usuario:** si el domicilio/teléfono/CUIT de la institución está incompleto o desactualizado, la única forma de corregirlo es que alguien con acceso directo a la API o a la base de datos lo haga — un usuario de negocio (secretaría, dirección) no tiene ningún camino en la interfaz para arreglar sus propios datos institucionales, que además terminan impresos en documentos oficiales (reportes en PDF).
**Recomendación:** (no implementar) Agregar una pantalla "Mi institución" bajo "Configuración" en el Sidebar, reusando el patrón de formulario ya existente en Agentes (campos + validación + guardar), apuntando a `GET`/`PATCH /api/mi-institucion`.

### UX-ADM-005 — El modal de "Eliminar agente" dice que la acción "no se puede deshacer", pero es reversible
**Prioridad:** P1  **Tipo:** ACCIÓN DESTRUCTIVA / MENSAJE
**Fuente:** prueba en vivo (API) — ciclo eliminar→reactivar confirmado
**Pantalla:** `/protected/dashboard/agentes`
**Acción:** click en "Eliminar" desde el menú "Gestionar ▾" de un agente.
**Resultado esperado:** el mensaje de confirmación debería reflejar la reversibilidad real de la acción (es un soft delete, no un borrado físico).
**Resultado actual:** el modal (`ModalConfirmar`) muestra: *"¿Eliminar este agente? Esta acción no se puede deshacer."* Sin embargo, `eliminarAgente` hace soft delete (`activo:false, deletedAt, estado:INACTIVO`) y la misma pantalla ofrece un botón "Reactivar" para ese mismo agente apenas se marca "Ver inactivos". Confirmado en vivo: `DELETE /api/agentes/10` → 200, luego `POST /api/agentes/10/reactivar` → 200, agente vuelve a estar activo con todos sus datos intactos.
**Evidencia:** `app/protected/dashboard/agentes/page.tsx` línea 334 (texto del modal) vs. `lib/repositories/agenteRepository.ts` líneas 135-144 (`eliminar`, soft delete) y 160-169 (`reactivar`); UI de "Reactivar" en `MenuGestionar`, líneas 174-183 del mismo `page.tsx`.
**Impacto para el usuario:** un usuario puede dudar en eliminar un agente por miedo a perder datos irreversiblemente (fricción innecesaria), o —el riesgo inverso— asumir por costumbre que "eliminar" en este sistema siempre es reversible (como acá) y confiarse en otra pantalla donde si sea destructivo, por la inconsistencia de mensaje entre pantallas del sistema.
**Recomendación:** (no implementar) Cambiar el texto del modal a algo como *"¿Eliminar este agente? Podrás reactivarlo más adelante desde 'Ver inactivos'."*, alineado con la realidad de la operación.

### UX-ADM-006 — Ninguna pantalla del módulo distingue una sesión inválida/expirada (401) de un error genérico
**Prioridad:** P1  **Tipo:** ERROR NO INFORMADO
**Fuente:** código (inferido) — patrón de manejo de errores; el disparador real (revocación de sesión) fue confirmado en vivo en UX-ADM-002
**Pantalla:** `/protected/dashboard/agentes` (y, por patrón, cualquier pantalla protegida que use el mismo `useAuth`)
**Acción:** cualquier fetch a `/api/*` devuelve 401 (sesión expirada, revocada, o inválida) durante el uso normal de la pantalla (no en la carga inicial, donde `useAuth` sí redirige si no hay token en `sessionStorage`).
**Resultado esperado:** la UI debería detectar el 401 y llevar al usuario a volver a iniciar sesión, con un mensaje que explique por qué.
**Resultado actual:** el código de `cargarAgentes()`, `guardar()`, `eliminar()` y `reactivar()` en `agentes/page.tsx` solo distingue "ok" de "no ok" (`if (!res.ok)`), y en el caso de listar, ni siquiera lee el body del error — siempre muestra el texto fijo "Error cargando agentes", sea 401, 403, 500 o lo que sea. No hay ningún `if (res.status === 401)` en todo el código de frontend del proyecto (`grep` sin resultados).
**Evidencia:** `app/protected/dashboard/agentes/page.tsx` líneas 235-245 (`cargarAgentes`, mensaje fijo sin leer `res.json()`), 273-292 (`guardar`), 294-308 (`eliminar`); `app/hooks/useAuth.ts` solo redirige si `sessionStorage` está vacío al montar, no reacciona a un 401 posterior.
**Impacto para el usuario:** si la sesión se invalida mientras el usuario está trabajando (expiración natural a los 7 días, o una revocación de acceso como en UX-ADM-002), ve "Error cargando agentes" — un mensaje que sugiere un problema del sistema o de datos, no que necesita volver a loguearse. El usuario no tiene forma de distinguir "hay un problema con el módulo Agentes" de "tu sesión venció".
**Recomendación:** (no implementar) Centralizar el manejo de fetch (ej. un wrapper sobre `fetch` compartido) que, ante 401, limpie el token y redirija a `/public/login` con un mensaje tipo "Tu sesión expiró, volvé a iniciar sesión", en vez de dejar que cada pantalla interprete el error a su manera.

### UX-ADM-007 — No hay ningún mecanismo de recuperación de contraseña
**Prioridad:** P1  **Tipo:** NAVEGACIÓN
**Fuente:** prueba en vivo (404 en la ruta del link) + código (grep sin resultados de ninguna funcionalidad de reset)
**Pantalla:** `/public/login`
**Acción:** click en "¿Olvidaste tu contraseña?".
**Resultado esperado:** algún flujo de recuperación (por email, o al menos una pantalla de contacto/instrucciones).
**Resultado actual:** el link apunta a `/auth/forgot-password`, que no existe (`curl` → HTTP 404 en vivo). Tampoco existe, en ningún punto del código, una funcionalidad de reseteo de contraseña — ni self-service, ni asistida por un admin (el único endpoint que toca contraseñas es la creación de usuario nuevo, `POST /api/usuarios`, que exige una contraseña pero no permite cambiar la de un usuario existente).
**Evidencia:** `app/public/login/page.tsx` líneas 250-260 (`href="/auth/forgot-password"`); búsqueda de `forgot-password`/`resetPassword`/`recuperarPassword` en todo el repo sin resultados fuera de ese único `href`.
**Impacto para el usuario:** cualquier usuario que olvide su contraseña queda completamente bloqueado — no hay self-service, y tampoco hay una pantalla donde un administrador pueda resetearla por él. Depende de intervención directa sobre la base de datos.
**Recomendación:** (no implementar) Como mínimo, quitar el link muerto o reemplazarlo por instrucciones de contacto reales mientras no exista el flujo. A mediano plazo, definir el flujo de recuperación (o, si el modelo de negocio lo prefiere, un endpoint de reseteo de contraseña ejecutable solo por un rol con permiso — lo cual también requeriría resolver primero UX-ADM-001).

### UX-ADM-008 — El nombre de usuario en el Topbar está hardcodeado ("Usuario"), no refleja quién inició sesión
**Prioridad:** P2  **Tipo:** ESTADO
**Fuente:** código (inferido)
**Pantalla:** todas las protegidas (Topbar es global)
**Acción:** cualquier usuario inicia sesión y navega el dashboard.
**Resultado esperado:** el Topbar debería mostrar el nombre real del usuario autenticado.
**Resultado actual:** `Topbar` recibe `userName = "Usuario"` como default y nunca se le pasa un valor real desde ningún layout — el propio código lo marca con un TODO: *"reemplazar con datos reales del usuario autenticado cuando implementes el contexto de sesión"*.
**Evidencia:** `app/ui/components/layout/Topbar.tsx` líneas 37-42 (prop `userName = "Usuario"`, comentario TODO en línea 38-39); `app/ui/components/layout/DashboardLayout.tsx` no pasa `pageTitle` ni ningún dato de usuario al `Topbar`.
**Impacto para el usuario:** en una app multi-usuario (varios agentes/roles por institución), no hay ninguna señal en la interfaz de quién es la sesión activa — relevante especialmente si alguien comparte una máquina o navega con varias cuentas.
**Recomendación:** (no implementar) Exponer el nombre del usuario autenticado (ya existe `getSession()`/`useAuth`) y pasarlo al `Topbar`.

### UX-ADM-009 — Sin selector de institución para usuarios con roles en más de una
**Prioridad:** P2  **Tipo:** NAVEGACIÓN
**Fuente:** código (inferido) — el modelo de datos lo permite, no se pudo confirmar en vivo un caso de usuario multi-institución real
**Pantalla:** Login / global
**Acción:** un `Usuario` con filas `UsuarioRol` en dos o más instituciones (el modelo lo permite explícitamente: `UsuarioRol` tiene PK compuesta `[usuarioId, rolId, institucionId]`) intenta operar en una institución distinta a la resuelta por el subdominio actual.
**Resultado esperado:** algún mecanismo en la UI para elegir con qué institución operar.
**Resultado actual:** el tenant se resuelve exclusivamente por subdominio (o header/`DEV_TENANT_DOMAIN` en desarrollo) antes del login; no hay ningún selector. Si el usuario necesita cambiar de institución, depende de cambiar de URL manualmente (o de que cada institución tenga su propio subdominio, lo cual no es una garantía visible en el código, solo una convención de despliegue).
**Evidencia:** `lib/tenant/resolveTenant.ts` (resolución 100% por header/subdominio); ausencia de cualquier componente de selección de institución en `app/`.
**Impacto para el usuario:** RIESGO / NO CONFIRMADO — depende de si en la operación real existen usuarios con roles en más de una institución (ej. una secretaría que atiende dos escuelas del mismo grupo). Si existen, no tienen forma de cambiar de contexto desde la UI.
**Recomendación:** (no implementar) Confirmar con el negocio si el caso de usuario multi-institución ocurre en la práctica; si sí, diseñar un selector post-login.

### UX-ADM-010 — Validación de email inconsistente entre "Mi institución" y "Agentes"
**Prioridad:** P2  **Tipo:** CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard/agentes` (comparado contra el backend de `mi-institucion`, sin pantalla propia)
**Acción:** cargar un email con formato inválido (sin "@", etc.) en el campo Email del formulario de agente.
**Resultado esperado:** mismo criterio de validación en todos los formularios del sistema que tienen un campo email.
**Resultado actual:** `actualizarMiInstitucion` rechaza con 400 "Email inválido" si el email no contiene "@" (`lib/usecases/miInstitucion/actualizarMiInstitucion.ts:23`). `crearAgente`/`actualizarAgente` no validan el formato del email en absoluto, ni en cliente ni en backend — cualquier string se guarda tal cual.
**Evidencia:** comparar `lib/usecases/miInstitucion/actualizarMiInstitucion.ts:23` vs. `lib/usecases/agentes/crearAgente.ts` (sin validación de email) y `app/protected/dashboard/agentes/page.tsx` (`CAMPOS`, el email no tiene `required` ni ninguna regex).
**Impacto para el usuario:** posibilidad de guardar un email de agente mal tipeado sin ningún aviso, lo cual después puede afectar cualquier flujo que dependa de ese email (comunicaciones, identificación).
**Recomendación:** (no implementar) Aplicar la misma validación de formato de email usada en `mi-institucion` al formulario/usecase de Agentes.

### UX-ADM-011 — El campo "Documento" del agente no valida formato
**Prioridad:** P3  **Tipo:** VALIDACIÓN UX
**Fuente:** prueba en vivo (API) — se creó un agente con documento `"AUDIT-UX-99999"` sin que el sistema lo rechazara
**Pantalla:** `/protected/dashboard/agentes`
**Acción:** cargar cualquier string no vacío en "Documento".
**Resultado esperado:** N/A si es una decisión de negocio (aceptar DNI, CUIT, pasaporte, legajo, etc. en un mismo campo); mencionado como observación menor.
**Resultado actual:** se acepta cualquier string no vacío, incluyendo letras y guiones, sin ningún formato esperado ni mensaje de ayuda sobre qué se espera en ese campo.
**Evidencia:** `lib/usecases/agentes/crearAgente.ts` línea 25 (`documento: String(documento).trim()`, sin más validación); campo `documento` en schema es `String` sin `@db` de longitud fija.
**Impacto para el usuario:** bajo — puede llevar a inconsistencia de formato entre agentes cargados por distintas personas, sin afectar ninguna operación crítica (la unicidad sí está garantizada por tenant).
**Recomendación:** (no implementar) Si el negocio espera un formato específico (ej. solo DNI numérico), agregar validación y texto de ayuda (`placeholder`) en el campo.

### UX-ADM-012 — "Reactivar" actualiza el estado local sin refetch, a diferencia de crear/editar/eliminar
**Prioridad:** P3  **Tipo:** CONSISTENCIA
**Fuente:** código (inferido)
**Pantalla:** `/protected/dashboard/agentes`
**Acción:** click en "Reactivar" sobre un agente inactivo.
**Resultado esperado:** mismo patrón de refresco que el resto de las acciones del CRUD.
**Resultado actual:** `guardar()` y `eliminar()` llaman `cargarAgentes()` para releer del servidor tras la acción; `reactivar()` en cambio actualiza el array local con `setAgentes(prev => prev.map(...))` sin volver a pedir datos al servidor.
**Evidencia:** `app/protected/dashboard/agentes/page.tsx` líneas 285 (`guardar`, refetch), 302 (`eliminar`, refetch) vs. 318 (`reactivar`, actualización local optimista).
**Impacto para el usuario:** bajo — en el caso normal no se nota, pero si hubiera un cambio concurrente de otro usuario sobre el mismo agente, la vista podría quedar desincronizada momentáneamente solo tras "Reactivar", no tras las otras acciones.
**Recomendación:** (no implementar) Unificar el patrón: usar refetch (`cargarAgentes()`) también tras reactivar, por consistencia con el resto del CRUD.

### UX-ADM-013 — Las rutas `/protected/*` no tienen ninguna protección server-side; dependen 100% del cliente
**Prioridad:** P2  **Tipo:** PERMISOS
**Fuente:** prueba en vivo
**Pantalla:** todas bajo `/protected/`
**Acción:** solicitar directamente `/protected/dashboard/agentes` sin ningún header de autenticación.
**Resultado esperado:** dado que el prefijo de la ruta es "protected", cabría esperar algún gate server-side (redirect 30x a login, o al menos que el HTML no se sirva sin sesión).
**Resultado actual:** el servidor responde 200 con el HTML completo de la página (confirmado en vivo, `curl` sin headers). La protección real ocurre recién en el cliente: `useAuth` redirige si no hay token en `sessionStorage`, y las llamadas a `/api/*` fallan con 401 por el `proxy.ts` (cuyo `matcher` es únicamente `/api/:path*`, no incluye páginas).
**Evidencia:** `proxy.ts` línea 89 (`matcher: ["/api/:path*"]`); `app/hooks/useAuth.ts` (gate solo client-side); prueba en vivo: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/protected/dashboard/agentes` → `200` sin ningún header.
**Impacto para el usuario:** no se filtran datos reales (esos siguen protegidos por el 401 de la API), pero el nombre "protected" en la URL es engañoso — un usuario sin JS, o cualquiera con la URL, puede ver la estructura de la pantalla (labels, columnas, textos) sin autenticarse. Es una falta de defensa en profundidad más que una fuga de datos confirmada.
**Recomendación:** (no implementar) Evaluar si conviene mover la verificación de sesión a nivel del propio `proxy.ts` extendiendo el `matcher` para cubrir `/protected/:path*`, redirigiendo a `/public/login` si no hay sesión válida, en vez de depender solo del `useAuth` del lado cliente.

## 7. Pantallas auditadas sin problemas relevantes

- **Aislamiento multi-tenant a nivel de datos** (agentes, y por extensión el patrón usado en el resto de repositorios via `institucionId`): confirmado en vivo que un token de un tenant con `x-tenant-id` de otro devuelve 403 claro, y que acceder a un recurso por id de otro tenant devuelve 404 limpio — nunca una lista vacía silenciosa ni datos cruzados. Esto también fue validado estáticamente por el script del propio repo `tests/auditar-multitenant.ts` (no se encontraron hallazgos "ALTO" pendientes al revisar los repositorios de este módulo).
- **Formulario de creación/edición de agente**: validación de requeridos clara, mensajes de error del backend mostrados tal cual (incluido el 409 de documento duplicado, con texto específico y accionable), estado "Guardando..." con botón deshabilitado durante el submit, no se pierden los datos cargados si falla la validación.
- **Botón "Eliminar" deshabilitado preventivamente** cuando el agente tiene asignaciones activas, con motivo visible en un tooltip/subtítulo — evita que el usuario intente una acción que sabemos de antemano que va a fallar.
- **Logout**: sin confirmación (correcto, es reversible con un nuevo login), muestra estado de carga, y limpia la sesión local incluso si el request de red falla (comentario explícito en el código: "mejor experiencia que quedar trabado").
- **Login**: validación de formato de email en cliente, limpieza de error al volver a tipear, manejo de error de red distinto del error de credenciales, envío con Enter desde cualquier campo.
- **Mensajes de error del backend de login/logout**: genéricos y consistentes a propósito ("Credenciales inválidas" tanto si el email no existe como si la contraseña es incorrecta) — buena práctica de seguridad, no un defecto de UX.

## 8. Áreas que no pudieron verificarse

- **Verificación visual/DOM real** (foco, contraste, comportamiento con teclado, lectura de screen reader, responsive): no se contó con navegador interactivo en este entorno. Todo lo relativo a estilos y accesibilidad está marcado "código (inferido)" y no fue evaluado en profundidad porque esta auditoría es funcional/operativa, no estética — priorizado según el alcance del prompt.
- **Caso real de usuario con roles en más de una institución** (UX-ADM-009): no se pudo confirmar si esto ocurre en la operación real del negocio; queda como riesgo no confirmado.
- **Comportamiento exacto del navegador ante el 401 de UX-ADM-006** (¿queda la pantalla congelada, se puede reintentar, hay algún reintento automático?): inferido por lectura de código, no observado en un navegador real.
- **Rutas fuera de este módulo que también usan `withContext`** (todas las demás pantallas de la app): se confirma que ninguna tiene control de rol porque `RequestContext` no lo transporta en ningún punto del código (`lib/types/context.ts`), pero no se revisó pantalla por pantalla si alguna implementa su propio control de rol por fuera de `withContext` — se considera de bajo riesgo dado que no se encontró ningún patrón de ese tipo en las búsquedas realizadas, pero no es una cobertura exhaustiva de todas las pantallas del sistema (eso corresponde a las auditorías de cada módulo).
- **Contenido completo de "configuracion" (JSON libre) de `Institucion`**: no se auditó qué claves usa el resto del sistema ni si `PATCH /api/mi-institucion` permite sobrescribir ese JSON de forma destructiva (reemplaza el objeto entero, no hace merge) porque no hay pantalla que lo edite hoy; queda como nota para cuando se implemente UX-ADM-004.

## 9. Lista priorizada de correcciones (sin implementar)

1. **UX-ADM-001** — Agregar verificación de rol/permiso en `POST`/`PATCH`/`DELETE /api/usuarios` antes de crear/reasignar/quitar roles.
2. **UX-ADM-002** — Revalidar rol/estado del usuario en cada request (o invalidar sesiones al quitar el último rol), no solo al login.
3. **UX-ADM-004** — Construir la pantalla "Mi institución" (backend ya existe y está testeado).
4. **UX-ADM-007** — Resolver el link muerto de "¿Olvidaste tu contraseña?" (quitarlo o implementar el flujo).
5. **UX-ADM-003** — Decidir si `GET /api/instituciones` debe seguir siendo público, y si sí, limitar campos/uso a lo estrictamente necesario para una futura UI.
6. **UX-ADM-005** — Corregir el texto del modal de eliminación de agente para reflejar que es reversible.
7. **UX-ADM-006** — Manejo centralizado de 401 en frontend (logout + redirect + mensaje claro) en vez de mensajes genéricos por pantalla.
8. **UX-ADM-013** — Evaluar extender el `matcher` del proxy para cubrir también `/protected/:path*`.
9. **UX-ADM-008** — Mostrar el nombre real del usuario autenticado en el Topbar.
10. **UX-ADM-010** — Unificar validación de formato de email entre formularios (Agentes vs. Mi institución).
11. **UX-ADM-009** — Confirmar con negocio si aplica un selector de institución; diseñar si corresponde.
12. **UX-ADM-012** — Unificar patrón de refresco de datos tras acción (reactivar vs. resto del CRUD).
13. **UX-ADM-011** — Evaluar si conviene validar formato de "Documento".
