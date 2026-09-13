# ALNEXT — Punto de partida / cierre de sesión 13/09/2026

## Resumen del día

Continuación directa de la sesión del 12/09, que había cerrado con el mecanismo de licencia resuelto y el instalador único (#222) sin bloqueadores de código. Hoy el foco fue preparar el terreno para construirlo con criterio: se corrió y revisó una auditoría técnica exhaustiva del proyecto orientada específicamente a ese instalador, se evaluó honestamente qué tan útil resulta para arrancar a programar, y se decidió no escribir código todavía — primero hace falta una prueba real contra un entorno que reproduzca la premisa de "PC compartida" de la escuela, no más análisis. La sesión terminó con ese entorno de prueba efectivamente armado y listo, no solo planeado.

## Hecho hoy

1. **Diseño y ejecución de la auditoría del instalador.** El usuario preparó un prompt de auditoría exhaustivo (alcance acotado: Node embebido + PostgreSQL vía instalador oficial en modo silencioso, con puerto/directorio propios) y lo corrió con Claude Code, aprovechando su acceso directo al repositorio para no depender del ciclo lento de copiar/pegar comandos de esta sesión. Resultado: `docs/auditoria-instalador-alnext.md`, ~715 líneas, con reglas de evidencia estrictas (EVIDENCIA/INFERENCIA/NO DETERMINADO).

2. **Revisión crítica del informe (esta sesión, no Claude Code):**
   - Confirmado vía `git status` que la auditoría respetó su restricción de no modificar nada más que el propio informe, y que no se hizo ningún commit durante el proceso.
   - Verificada la cita a `docs/Diseño MVP de sistema de licencias.md` — resultó ser un documento real y preexistente del 08/09/2026 (anterior al alcance de memoria de esta sesión), no una alucinación del informe.
   - Evaluación de calidad: uso disciplinado de las etiquetas de evidencia, sin conclusiones genéricas sin respaldo; hallazgo destacado — la contradicción entre el puerto 5433 hardcodeado en `package.json` (versionado) y la recomendación de usar 5432 en la máquina de la escuela "porque no debería haber conflicto", señalada correctamente como contradicción que viola la premisa misma de la auditoría, sin corregirla (como correspondía a su alcance).

3. **Evaluación de utilidad real para arrancar el instalador — buenas y malas noticias:**
   - Buenas: backup/restore, generación de Prisma Client, migraciones y el seed por escuela ya están construidos, probados y listos para reutilizar/automatizar sin trabajo nuevo de diseño.
   - Malas: la pieza de mayor riesgo (invocar el instalador oficial de PostgreSQL en modo silencioso, con puerto/directorio propios) sigue siendo 100% terreno no probado — todo lo que dice la auditoría sobre eso es inferencia de documentación externa de PostgreSQL/EDB, no evidencia verificada contra este proyecto. Tampoco existe hoy ningún mecanismo de arranque/detención de la aplicación. Y se confirmó como hallazgo real (no hipotético) el puerto 5433 hardcodeado en un archivo versionado.

4. **Estimación de tiempo para un primer beta:** 3 a 6 sesiones de trabajo (aprox. 2 a 4 semanas de calendario al ritmo actual del proyecto), con la salvedad explícita de que casi toda la incertidumbre está concentrada en el paso de PostgreSQL — no es un problema que más análisis pueda resolver, requiere una prueba real.

5. **Decisión: montar primero un entorno de prueba antes de escribir código del instalador.** Se descartó seguir directo con el paso 1 del plan (Node embebido) sin más, porque el paso que realmente define el instalador (Postgres) necesita validarse contra una máquina que reproduzca honestamente la premisa de PC compartida — algo que la máquina de desarrollo actual no puede hacer (ya tiene su propio Postgres 18 en el 5433).

6. **Entorno de prueba armado de punta a punta en esta misma sesión:**
   - VirtualBox 7.2.16 descargado e instalado en la máquina host, sin inconvenientes (advertencias normales de red y de dependencias de Python aceptadas, no relevantes para este uso).
   - ISO oficial de Windows 11 (25H2, x64, es-ES) descargada completa desde el sitio oficial de Microsoft, sin necesidad de clave de producto.
   - VM `ALNEXT-test` creada con instalación desatendida (modo experto de VirtualBox): 4096 MB RAM, 2 CPUs, disco de 80 GB.
   - Confirmados habilitados automáticamente por VirtualBox los tres requisitos de Windows 11: **EFI: Habilitado, Tipo TPM: 2.0, Secure Boot: Habilitado**.
   - Windows 11 instalado solo de punta a punta (proceso desatendido, sin intervención manual), escritorio confirmado funcionando.
   - **Primera snapshot tomada** ("Instantánea 1", 13/9/2026 18:47) — punto de restauración limpio, antes de instalar nada más dentro de la VM.

## Decisión de cierre de sesión

Se corta acá con el entorno de prueba ya armado y funcionando — no quedó solo en preparación, como se esperaba al empezar el día. La idea explícita era dejarlo listo para retomar mañana directamente con la prueba de humo del instalador de Postgres, sin perder tiempo de setup en la próxima sesión. Falta el segundo escenario (conflicto de puerto) y la prueba en sí, que quedan para mañana.

## Pendiente (orden sugerido al retomar)

1. Instalar manualmente una segunda instancia de PostgreSQL dentro de la VM, ocupando a propósito un puerto común (5432 o 5433), y tomar una segunda snapshot ("VM con conflicto de puerto") — para reproducir de verdad la premisa de PC compartida.
2. Prueba de humo real: invocar el instalador oficial de PostgreSQL 18 en modo silencioso contra el escenario limpio (snapshot 1) primero, después contra el de conflicto (snapshot 2), documentando qué pasa en cada caso (puerto ocupado, permisos de administrador, identificación del servicio). Esto resuelve la mayoría de los `[NO DETERMINADO]`/`[INFERENCIA]` de la sección de viabilidad del informe.
3. Con resultados reales de esa prueba, recién ahí firmar una estimación de tiempo más precisa para el resto del plan.
4. En paralelo, si se prefiere adelantar algo que no depende de la VM: paso 1 (fijar versión de Node y empezar a evaluar el runtime embebido) y paso 2 (corregir el puerto 5433 hardcodeado en `package.json`) del plan de la auditoría.
5. Resto del backlog sin tocar, sin cambios respecto al cierre del 12/09: tarea #11 (Ceferino), #167-173 (tests desactualizados), #204/#205-217 (hallazgos UX-ADM), dos `.sql` sueltos en la raíz, cosmético del nombre de `docs/ Verdades del entorno — ALNEXT.md`.

## Estado del repo al cierre

Sin cambios de código de la aplicación. `docs/auditoria-instalador-alnext.md` (generado hoy por Claude Code) y este documento de cierre commiteados juntos. Último commit de código real sigue siendo `8e5daf3` (cierre del 12/09, licencia consolidada en `proxy.ts`). Institución de prueba sin cambios de estado desde entonces.

## Nota técnica: VM de prueba

- Nombre: `ALNEXT-test`, en VirtualBox 7.2.16, carpeta `C:\Users\leand\VirtualBox VMs\ALNEXT-test`.
- Windows 11 Home 64-bit (25H2, es-ES), usuario `vboxuser`.
- 4096 MB RAM, 2 CPUs, disco `ALNEXT-test.vdi` de 80 GB.
- EFI + TPM 2.0 + Secure Boot habilitados y confirmados.
- Snapshot "Instantánea 1" = estado limpio post-instalación, sin ningún software adicional instalado todavía — punto de partida para mañana.
