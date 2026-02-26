# 📊 Diagrama de Estados – Sistema Gestión Horaria (v1)

---

## 1️⃣ Asignacion

### Estados posibles

- ACTIVA
- INACTIVA

### Reglas

- Se crea siempre en estado ACTIVA.
- Puede pasar de ACTIVA → INACTIVA.
- No se permite reactivar una asignación inactiva.
- No se elimina físicamente (soft delete prohibido).
- Las incidencias no cambian el estado de la asignación.

---

## 2️⃣ DistribucionHoraria

### Estados posibles

- VIGENTE
- CERRADA

### Reglas

- Se crea siempre como VIGENTE.
- Solo puede existir una VIGENTE por asignación.
- Cuando se crea una nueva versión:
  - La versión anterior pasa a CERRADA.
- No se permite modificar una versión CERRADA.
- No se elimina ninguna versión.

---

## 3️⃣ Incidencia

### Estados implícitos (derivados por fecha)

- ACTIVA → si fecha_actual ∈ [fecha_inicio, fecha_fin]
- FINALIZADA → si fecha_actual > fecha_fin
- FUTURA → si fecha_actual < fecha_inicio

### Reglas

- Son inmutables.
- No se editan.
- No se eliminan.
- Pueden tener incidencia_padre_id.
- No pueden generar ciclos.
- Solo puede haber una incidencia activa por asignación en el mismo rango temporal.