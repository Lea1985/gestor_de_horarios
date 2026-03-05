# 🌳 Cadena de Reemplazos – Incidencias (v1)

---

## Modelo

Incidencia puede tener:

- incidencia_padre_id (nullable)

Esto genera una estructura tipo árbol.

---

## Ejemplo Real

Asignación A

Incidencia 1:

- fecha_inicio: 01/03
- fecha_fin: 31/03
- padre: null

Incidencia 2:

- fecha_inicio: 10/03
- fecha_fin: 20/03
- padre: Incidencia 1

Incidencia 3:

- fecha_inicio: 15/03
- fecha_fin: 18/03
- padre: Incidencia 2

---

## Reglas Estructurales

- No se permiten ciclos.
- Una incidencia puede tener múltiples hijas.
- Las fechas de la hija deben estar contenidas dentro del rango de la madre.
- No se permite superposición entre hijas hermanas en el mismo rango.
- No se modifican incidencias existentes.
- Si una incidencia necesita corrección → se crea una nueva.

---

## Consulta Operativa

Para reconstruir la cadena:

- Buscar incidencia raíz (padre = null).
- Recorrer descendientes por incidencia_padre_id.
- Ordenar por fecha_inicio.

---

## Principio

La cadena representa reemplazos estructurales, no ediciones.
El historial nunca se altera.
