# 📊 Diagrama ER – Sistema de Gestión Horaria Estructural (v3.1)

## Relaciones principales

- **Institucion (1) — (N) Persona**  
  Toda persona pertenece a una única institución.  
  El documento identificatorio es único dentro de esa institución.

- **Institucion (1) — (N) UnidadOrganizativa**  
  Cada unidad operativa pertenece a una institución.  
  No existen unidades compartidas entre instituciones.

- **Institucion (1) — (N) ModuloHorario**  
  Los módulos horarios son configurables y exclusivos por institución.  
  No pueden superponerse dentro del mismo contexto institucional.

- **Persona (1) — (N) Asignacion**  
  Una persona puede tener múltiples asignaciones activas o históricas.  
  La superposición horaria efectiva se valida a nivel de distribución.

- **UnidadOrganizativa (1) — (N) Asignacion**  
  Una unidad puede tener múltiples asignaciones asociadas.

- **Asignacion (1) — (N) DistribucionHoraria**  
  La distribución horaria es versionada por asignación.  
  No se sobreescriben versiones anteriores.

- **DistribucionHoraria (N) — (N) ModuloHorario**  
  Se materializa mediante la entidad intermedia **DistribucionModulo**.  
  Permite:
  - Versionado estructural.
  - Validación de duplicación de módulos.
  - Control de coherencia horaria por versión.

- **Asignacion (1) — (N) Incidencia**  
  Las incidencias se registran siempre sobre una asignación existente.  
  Son inmutables y poseen rango completo de fechas.

- **Incidencia (1) — (N) Incidencia**  
  Relación recursiva mediante `incidencia_padre_id`.  
  Permite encadenamiento jerárquico (estructura tipo árbol).

---

## Entidades Clave Derivadas

- **DistribucionModulo**
  - Vincula módulos a una versión específica de distribución.
  - No existe de forma independiente.
  - Garantiza trazabilidad estructural.

---

## Notas de alineación estructural

1. Se elimina completamente Cargo, Designación, Escuela, Curso y Comisión como entidades estructurales.
2. **Asignacion** reemplaza cualquier relación normativa previa.
3. **DistribucionHoraria** permite versionado sin sobrescritura.
4. **Incidencia** es inmutable y encadenable.
5. El modelo es sector-agnóstico y SaaS multi-tenant.
6. No se permite eliminación destructiva de entidades estructurales.
7. La validación de coherencia horaria ocurre en el nivel de DistribucionHoraria, no en Asignacion.

---

## Principio estructural del ER

El modelo prioriza:

- Integridad histórica.
- Versionado explícito.
- Trazabilidad completa.
- Aislamiento multi-tenant.
- Coherencia horaria transversal por persona.