# Punto de partida — sesión de cierre 24/09/2026

## Objetivo del día

Corregir el bug de `robocopy` encontrado ayer (23/09) que rompía el Paso 4/4
del instalador offline, y volver a correr la prueba end-to-end completa en
una VM genuinamente en blanco, sin internet.

## Qué se hizo

1. **Corregido el `robocopy`** que arma `app/` dentro del paquete offline:
   se sacaron `next` y `node` de la lista `/XF` (rompían
   `node_modules\next\dist\bin\next` por coincidencia de nombre de archivo
   exacto en cualquier profundidad). Confirmado con `Test-Path` que el
   binario ahora sí se copia.
2. **Hallazgo de código no mergeado**: la pantalla "Mi institución"
   (commit `f2d7583`, tarea #208) nunca se había mergeado a
   `feature/instalador-alnext` — quedó huérfana en su propia rama
   `fix/ux-adm-004-mi-institucion`. Se trajo con `git cherry-pick f2d7583`
   (limpio, sin conflictos) y se pusheó (`4281a85..65b199d`).
3. Refresco de `C:\ALNEXT\app` en la VM `ALNEXT-test` (`git pull` + `npm ci`)
   y re-armado de `app/` en el paquete offline con el `robocopy` corregido.
4. Regeneración del zip (656.4 MB) — con un incidente en el medio: la VM
   `ALNEXT-test` quedó sin responder a input mientras el `tar` corría,
   causado por una combinación de RAM del host casi agotada (92%, por
   Chrome con 19 pestañas + otras apps) y Windows Defender escaneando en
   tiempo real cada archivo del `tar` (`Antimalware Service Executable` al
   40% CPU). Se cerraron aplicaciones del host, y ante la falta de
   respuesta se apagó forzosamente la VM. **Los datos sobrevivieron
   intactos** (confirmado con `Test-Path` y conteo de archivos idéntico
   post-reinicio) porque el `robocopy` ya había terminado y flusheado a
   disco antes de iniciar el `tar`.
5. Transferencia del zip vía pendrive a una VM genuinamente en blanco
   (instantánea "Instantánea 1"), extracción, desconexión de red, y
   re-ejecución de `Install-ALNEXT.ps1` (esta vez usando `-AppDir` apuntando
   directo al paquete extraído, evitando una copia manual redundante).
6. **Pasos 1-3 del instalador: OK** (Preflight, Postgres, base de
   datos+seed) — igual que ayer.
7. **Paso 4/4: encontrado un bug nuevo y real**, distinto al de ayer:
   `next build` fallaba porque `app/layout.tsx` usa `next/font/google`
   (tipografía Geist), que intenta descargar el archivo de fuente desde
   `fonts.googleapis.com` en tiempo de build. Sin internet, el build aborta
   con exit code 1.

## Fixes aplicados hoy (código, no solo instalador)

- **`app/layout.tsx` y `app/globals.css`**: se sacó la dependencia de
  `next/font/google` y se reemplazó por la pila de fuentes del sistema
  operativo (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
  Arial, sans-serif` para `--font-sans`; equivalente monoespaciado para
  `--font-mono`, que además estaba roto desde antes — apuntaba a una
  variable `--font-geist-mono` que nunca se definía en ningún lado del
  código). Se evaluó usar el paquete npm `geist` (autohosteado, sin
  llamadas de red) pero `npm install` falló repetidamente en WSL con
  `ETIMEDOUT` pese a que `curl`/`ping` a los mismos hosts funcionaban bien
  — causa no identificada, quedó de lado por privilegiar la fuente de
  sistema (más simple, cero dependencias, decisión consciente de que el
  público de ALNEXT son escuelas con redes a veces restrictivas, donde
  "tener internet" no garantiza que un dominio puntual como
  `fonts.googleapis.com` esté accesible).
- **Segundo bug encontrado al validar el build localmente**: `next build`
  fallaba de nuevo, esta vez por `useSearchParams()` sin `<Suspense>` en
  `/protected/dashboard/incidencias` — el mismo problema que ya se había
  arreglado en `/clases` (tarea #253), pero que había quedado sin aplicar
  en `/incidencias`. Se encontró que el fix ya existía, otra vez huérfano
  en una rama sin mergear (`fix/prerender-y-tenant-localhost`, commit
  `4ff10c5`, que arreglaba Suspense en 4 páginas: `clases`,
  `codigarios/[id]`, `codigarios`, `incidencias`). Se trajo con
  `git cherry-pick -n 4ff10c5` (aplicó limpio pese a que `clases/page.tsx`
  y `resolveTenant.ts` ya habían sido tocados independientemente en este
  branch).
- Ambos fixes verificados con `npm run build` local en WSL:
  **compiló y generó las 67 páginas sin errores.**
- Commits pusheados a `feature/instalador-alnext`:
  - `65b199d`: cherry-pick de "Mi institución".
  - `679c067`: cherry-pick de Suspense boundary en incidencias/codigarios +
    resolveTenant (de `4ff10c5`).
  - `0039751`: "fix: reemplazar next/font/google (Geist) por fuente de
    sistema".

## Hallazgo transversal del día

Van dos veces en dos sesiones seguidas (22/09 y 24/09) que aparece código
ya desarrollado y con tarea marcada `completed` en el tracker, pero que
en realidad vivía en una rama nunca mergeada a `feature/instalador-alnext`
(`fix/ux-adm-004-mi-institucion` y `fix/prerender-y-tenant-localhost`).
Vale la pena, en algún momento, auditar todas las ramas locales/remotas del
repo contra `feature/instalador-alnext` para detectar si queda más trabajo
"completado" pero no integrado:

```bash
for b in $(git branch --all --format='%(refname:short)' | grep -v HEAD); do
  echo "=== $b ==="
  git log --oneline "$b" --not feature/instalador-alnext | head -5
done
```

## Auditoría de ramas y limpieza (post-cierre, mismo día)

Se corrió la auditoría sugerida arriba contra todas las ramas locales y
remotas. Resultado: la única rama con commits fuera de
`feature/instalador-alnext` era `fix/prerender-y-tenant-localhost`
(el mismo commit `4ff10c5` ya traído por cherry-pick). Se verificó con
`git diff` (vacío) que el contenido final en disco es idéntico entre
ambas ramas antes de borrar, y se eliminó la rama local y remota:

```bash
git branch -D fix/prerender-y-tenant-localhost
git push origin --delete fix/prerender-y-tenant-localhost
```

**Conclusión: no queda ningún trabajo huérfano sin mergear.** El repo
está limpio para rearmar el paquete offline con confianza en la próxima
sesión.

## Pendiente para la próxima sesión

1. Re-armar `app/` en el paquete offline con el código actualizado
   (`git pull` en `ALNEXT-test` para traer los 2 fixes de hoy, `npm ci`,
   `robocopy` corregido). La auditoría de ramas ya se hizo hoy (ver
   sección de arriba) — no hace falta repetirla antes de reempaquetar.
2. Regenerar el zip y volver a transferir a una VM en blanco.
3. Correr `Install-ALNEXT.ps1` de punta a punta sin interrupciones y
   confirmar que los 4 pasos pasan — sería la primera validación 100%
   limpia del instalador offline completo.
4. Cerrar definitivamente la tarea #248 (empaquetado) una vez confirmado.
5. Pendiente sin resolver, no bloqueante: entender por qué `npm install`
   falla específicamente en WSL con `ETIMEDOUT` mientras `curl`/`ping`
   funcionan — puede que reaparezca con otros paquetes.
6. Considerar agregar a `Configure-AccesoRemoto.ps1` la regla de firewall
   automática (pendiente de sesiones anteriores, no tocado hoy).

## Notas operativas (nuevas de hoy)

- Cuando una VM de VirtualBox deja de responder a input durante una
  operación de I/O pesada (como `tar` sobre miles de archivos), revisar
  primero el Administrador de Tareas del **host** — si el proceso de la VM
  sigue consumiendo CPU real, probablemente sigue viva y solo la GUI está
  saturada, no forzar el apagado todavía.
- Windows Defender escaneando en tiempo real puede ser un cuello de
  botella serio en operaciones de compresión/descompresión masivas dentro
  de una VM; considerar una exclusión temporal (`Add-MpPreference
  -ExclusionPath`, requiere consola realmente elevada) para este tipo de
  pruebas en el futuro.
- Apagar una VM a la fuerza (host_estimated worst case) no corrompió datos
  ya escritos a disco en esta ocasión — el robocopy previo había
  flusheado correctamente antes del corte.
- `next/font/google` (y por extensión cualquier mecanismo que descargue
  activos en tiempo de build) es incompatible por diseño con instalaciones
  sin internet garantizado — vale la pena, a futuro, auditar el resto del
  proyecto por otras dependencias similares (imágenes remotas, iconos de
  CDN, etc.) antes de dar por cerrado el empaquetado offline.
