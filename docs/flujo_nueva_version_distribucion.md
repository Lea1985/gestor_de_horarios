# 🔄 Flujo Transaccional – Nueva Versión de Distribución Horaria (v1)

---

## Objetivo

Crear una nueva versión de DistribucionHoraria sin romper integridad histórica ni coherencia horaria.

---

## Flujo

1️⃣ Usuario solicita nueva versión.

2️⃣ Sistema inicia transacción.

3️⃣ Validaciones previas:

- Existe asignación activa.
- No existe otra operación de versión en curso.
- Los módulos no se superponen.
- No violan coherencia horaria transversal por persona.

4️⃣ Sistema obtiene versión VIGENTE actual.

5️⃣ Marca versión actual como CERRADA.

6️⃣ Crea nueva DistribucionHoraria:
   - estado = VIGENTE
   - version = version_anterior + 1
   - fecha_creacion = now()

7️⃣ Inserta registros en DistribucionModulo.

8️⃣ Commit.

---

## Reglas críticas

- Todo ocurre dentro de una única transacción.
- Si falla cualquier validación → rollback total.
- Nunca se actualizan módulos de una versión anterior.