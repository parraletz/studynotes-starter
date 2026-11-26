# 03 · Agrega una feature

Plantilla. Cambia la primera línea por lo que quieras construir.

```
Feature: <describe aquí lo que quieres, por ejemplo "filtrar notas por tag con GET /api/notes?tag=aws">

Sigue AGENTS.md. Antes de escribir código:
1. Dime qué patrón de acceso nuevo necesita la feature y si el diseño actual de la tabla
   (PK = USER#<userId>, SK = NOTE#<id>) lo resuelve sin Scan. Si no, propón la opción más
   barata (filtro, GSI, otro tipo de item) y su impacto en costo.
2. Dame el plan: archivos que vas a tocar, rutas nuevas, tests nuevos, cambios de infraestructura.
3. Espera mi aprobación.

Después:
4. Implementa con tests en test/ usando MemoryNotesRepo.
5. Corre `npm run check`.
6. Si hay cambios de infraestructura, corre `npm run diff`, explícalo y espera aprobación antes de desplegar.
7. Resume qué cambiaste, cómo lo probaste y cómo revertirlo.
```

## Ideas para practicar (y para el hackathon)

| Feature | Qué aprendes |
|---|---|
| **Filter by tag** | Filtros vs. índices secundarios (GSI) |
| **Likes counter** | `UpdateItem` atómico con `ADD` |
| **Version history** | Varios tipos de item bajo la misma PK |
| **Export notes as ZIP** | S3 + URL prefirmada de descarga |
| **Attachments** | Subida directa a S3 con URL prefirmada |
| **Sign in** | Autenticación real con Amazon Cognito (adiós `x-user-id`) |
| **Summarize note** | IA generativa con Amazon Bedrock |
