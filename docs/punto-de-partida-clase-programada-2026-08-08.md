Informe de cierre — 07/08/2026

Hecho hoy: se cerró por completo el hallazgo de la sesión anterior (tarea #23: "titular más reciente" en vez de "titular vigente en la fecha" en incidencias), en dos vueltas.

Vuelta 1 — bug confirmado y arreglado. La ficha de una incidencia mostraba el titular actual de la asignación en vez de quién realmente tuvo esa incidencia, porque el include del repositorio siempre traía titularidades[0] (el más reciente) sin filtrar por fecha. Se agregó obtenerRaizFechaDesde (resuelve la fecha de la raíz de la cadena, necesaria para hijas/nietas) y se ancló el titular mostrado a esa fecha. De paso apareció y se arregló un bug relacionado en cambiarTitularAsignacion.ts: no normalizaba a medianoche UTC, dejando un hueco de horas sin titular vigente (mismo patrón de bug de timezone de la semana pasada, esta vez del lado del servidor). Commit 755abd7.

Vuelta 2 — corrección de diseño. Al verificar en vivo con la cadena de 3 niveles armada hoy (Juárez, Romina → hija con Pepo Pipo → nieta con Pérez), notaste que mostrar siempre "Romina" en toda la cadena confunde — lo correcto es que cada incidencia hija/nieta muestre quién disparó ese nivel puntual (el suplente que se ausentó), no siempre el titular raíz. Se rediseñó: la card de detalle ahora muestra "Titular" (siempre Romina, como contexto) y "Agente ausente" (quien corresponda a ese nivel) por separado, y se extendió el mismo criterio a la lista de incidencias completa (antes solo mostraba el titular más reciente ahí también). Verificado en las 3 páginas de detalle y en la lista — todo consistente. Commit c66feae.

De paso: quedó documentada la tarea #24 (mejora, no bug: el banner de una incidencia debería narrar la cadena completa de reemplazos, no solo el último salto) — no bloquea nada, queda para cuando haya tiempo.

Pendiente para la próxima sesión, en orden:

Terminar el sweep de la tarea #23 sobre los sospechosos que quedaron sin revisar: lib/pdf/datasets/ausencias.ts y lib/pdf/datasets/profesor.ts (los más serios, son reportes históricos), y de paso lib/reporting/datasets/obtenerClasesOperativas.ts. El resto de las ~20 ocurrencias del grep original son probablemente usos legítimos de "titular actual", pero conviene confirmarlo de pasada.
Tarea #24 (opcional, mejora del banner).
Recién después, retomar el plan de validación del Dashboard (#10).
Seed real de Codigario + Colegio Ceferino (#11), al final de la cola.