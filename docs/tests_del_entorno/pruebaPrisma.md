[Inicio del script]
        │
        ▼
[Conectar a PostgreSQL mediante Prisma]
        │
        ▼
[✅ Conexión exitosa?]
        │
   ┌────┴─────┐
   │          │
  Sí         No
   │          │
   ▼          ▼
[Listar todas las    [❌ Mostrar error de conexión y terminar]
 instituciones]
   │
   ▼
[Buscar si "Escuela de Prueba" existe]
   │
   ┌───────┴────────┐
   │                │
 No (no existe)     Sí (ya existe)
   │                │
   ▼                ▼
[Crear institución] [Mostrar mensaje que ya existe]
   │
   ▼
[Eliminar institución de prueba]
   │
   ▼
[✅ Test finalizado, mostrar resultados]
   │
   ▼
[Fin del script]