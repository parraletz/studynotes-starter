# AGENTS.md — StudyNotes starter

Instrucciones para agentes de programación (Codex, GitHub Copilot, Claude Code, Cursor, Kiro, Devin, Gemini…).
Este archivo es la fuente de verdad; `CLAUDE.md`, `.github/copilot-instructions.md` y `.kiro/steering/` apuntan aquí.

## Contexto

- Proyecto de aprendizaje del **Bootcamp AWS desde cero** (Código Facilito × AWS). El usuario probablemente es
  **nuevo en AWS**: explica lo que haces en español, en pasos cortos, sin jerga innecesaria.
- App: **StudyNotes**, notas de estudio con etiquetas. API + UI mínima en un solo servidor HTTP.
- Stack: **Node.js 24 + TypeScript + Hono** sobre **AWS Lambda Web Functions**, datos en **DynamoDB** (on-demand),
  infraestructura con **AWS CDK** (construct `WebFunction` de `aws-cdk-lib/aws-lambda`).
- Prioridad #1: **costo casi cero** para quien empieza. Prioridad #2: que el usuario entienda y revise cada cambio.

## Mapa del repo

| Ruta | Qué es |
|---|---|
| `src/server.ts` | Entrada. Escucha en `AWS_LAMBDA_HTTP_ENDPOINT` (`host:puerto`) o `127.0.0.1:3000` en local |
| `src/app.ts` | Rutas Hono: `GET /`, `GET /api/health`, CRUD en `/api/notes` |
| `src/notes-repo.ts` | `NotesRepo` con dos implementaciones: `DynamoNotesRepo` y `MemoryNotesRepo` |
| `src/ui.ts` | UI en un solo HTML (sin build de frontend) |
| `infra/stack.ts` | Tabla DynamoDB + Web Function + endpoint con topes de costo |
| `test/` | Tests con Vitest contra `MemoryNotesRepo` (no tocan AWS) |
| `scripts/doctor.mjs` | Revisión del ambiente; `--json` para que la leas tú |
| `prompts/` | Flujos guiados que el usuario puede pegarte |

## Comandos

```bash
npm run doctor           # SIEMPRE primero si algo de AWS falla. Usa `node scripts/doctor.mjs --json`
npm run dev              # local en http://127.0.0.1:3000, datos en memoria
npm run check            # typecheck + tests. Debe pasar antes de cualquier deploy
npm run build            # bundle a dist/index.cjs (esbuild)
npm run diff             # build + cdk diff: el PLAN de cambios en AWS
npm run deploy           # build + cdk deploy
npm run destroy          # borra todo lo creado
```

## Reglas para agentes

1. **Plan antes que acción en AWS.** Antes de `npm run deploy`, corre `npm run diff`, resume en lenguaje simple
   qué se crea/cambia/borra y **espera la aprobación explícita del usuario**. Nunca despliegues ni destruyas sin ella.
2. **Credenciales.** Solo sesiones temporales (`aws login` u OAuth del AWS MCP Server). Nunca pidas, escribas ni
   guardes access keys. Nunca pongas secretos en el código, en `.env` versionado ni en variables de entorno de la
   Web Function (usa Secrets Manager / SSM si hiciera falta).
3. **Costo.** No subas `maxEnvironments` (2) ni `rateLimit` (100) en `infra/stack.ts` sin que el usuario lo pida.
   No agregues servicios con costo fijo por hora (NAT Gateway, RDS/Aurora provisionado, OpenSearch, EC2, ALB)
   sin advertir el costo mensual aproximado y pedir confirmación. Prefiere on-demand y pago por uso.
4. **Mínimo privilegio.** Permisos con `grant*` de CDK sobre recursos concretos. Nada de `"*"` en `Action` ni `Resource`.
5. **Tests.** Cada ruta nueva lleva test en `test/` usando `MemoryNotesRepo`. `npm run check` debe pasar.
6. **Modelo de datos.** Una sola tabla: `PK = USER#<userId>`, `SK = NOTE#<id>`. Diseña llaves a partir de los
   patrones de acceso. Evita `Scan`. Si una feature necesita otro patrón, propone un GSI y explica por qué.
7. **Identidad de demo.** `x-user-id` es falsificable: no lo presentes como seguridad. Si el usuario quiere datos
   reales o compartir la URL, propón agregar autenticación (por ejemplo Amazon Cognito) antes.
8. **Web Functions.** El servidor debe escuchar en `AWS_LAMBDA_HTTP_ENDPOINT` en menos de 10 s; el entorno es
   Arm64 con 2 GB; no guardes estado entre peticiones en memoria (usa DynamoDB); el bundle es `dist/index.cjs`.
   Usa las skills y la documentación del Agent Toolkit for AWS (`aws___search_documentation`) en lugar de tu memoria
   para detalles de Lambda Web Functions: es un servicio nuevo.
9. **Explica y verifica.** Al terminar una tarea: qué cambiaste, cómo lo probaste, cómo revertirlo.

## Flujos que el usuario te puede pedir

| Si el usuario dice… | Haz esto |
|---|---|
| "prepara mi ambiente" / "setup" | Sigue `prompts/01-prepara-tu-ambiente.md` |
| "despliega" / "primer deploy" | Sigue `prompts/02-primer-deploy.md` |
| "agrega una feature …" | Sigue `prompts/03-agrega-una-feature.md` |
| "¿cuánto me cuesta?" | Revisa `infra/stack.ts`, explica el modelo de cobro (README, sección Costos) y sugiere la calculadora de AWS |
| "limpia" / "borra todo" | Sigue `prompts/04-limpia-tu-cuenta.md` |
