# StudyNotes · starter kit agéntico para AWS

Material extra del **Bootcamp AWS desde cero** (Código Facilito × AWS).

Una app real y pequeña para que empieces a construir en AWS **con tu agente de IA** y **sin miedo a la factura**:

- **AWS Lambda Web Functions**: tu servidor HTTP (Hono + Node.js 24) corre tal cual, sin adaptadores. Tiene su
  propia URL HTTPS y escala a cero cuando nadie lo usa.
- **Amazon DynamoDB on-demand**: pagas por petición; sin tráfico, solo centavos de almacenamiento.
- **AWS CDK**: toda la infraestructura en `infra/stack.ts`. Un comando para crear y otro para borrar.
- **Listo para agentes**: `AGENTS.md` y prompts guiados para Codex, GitHub Copilot, Claude Code, Cursor, Kiro y otros.

```
Navegador ──HTTPS──► Lambda Web Function (Hono: UI + /api/notes) ──► DynamoDB
                       máx. 2 entornos · máx. 100 req/s
```

## Empieza en 3 pasos

### 1. Clona y abre con tu agente

```bash
git clone <este-repo> studynotes && cd studynotes
npm install
```

Abre la carpeta en tu agente favorito. Todos leen `AGENTS.md`:

| Agente | Cómo toma las instrucciones |
|---|---|
| Codex · Cursor · Devin · otros | `AGENTS.md` |
| Claude Code | `CLAUDE.md` → importa `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` → `AGENTS.md` |
| Kiro | `.kiro/steering/studynotes.md` → `AGENTS.md` |

### 2. Prepara tu ambiente (con tu agente)

Pega el prompt de [`prompts/01-prepara-tu-ambiente.md`](prompts/01-prepara-tu-ambiente.md). El agente corre
`npm run doctor`, te explica qué falta y te guía para instalarlo: Node.js 24, AWS CLI, `aws login`, región,
`cdk bootstrap` y el **Agent Toolkit for AWS** para que se conecte a tu cuenta con permisos y auditoría.

¿Prefieres hacerlo a mano?

```bash
npm run doctor     # te dice qué falta y cómo resolverlo
aws login          # sesión temporal, nunca access keys
aws configure agent-toolkit
npm run bootstrap  # una vez por cuenta y región
```

### 3. Corre local, luego despliega

```bash
npm run dev        # http://127.0.0.1:3000, datos en memoria, sin AWS
npm run check      # typecheck + tests
npm run diff       # 👀 qué se va a crear en AWS
npm run deploy     # crea todo y te da la URL
```

O pega [`prompts/02-primer-deploy.md`](prompts/02-primer-deploy.md) y deja que el agente te guíe (te pedirá
aprobación antes de tocar tu cuenta).

**Cuando termines:** `npm run destroy` o [`prompts/04-limpia-tu-cuenta.md`](prompts/04-limpia-tu-cuenta.md).

## La API

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/` | UI |
| `GET` | `/api/health` | Estado |
| `GET` | `/api/notes` | Lista tus notes, más recientes primero |
| `POST` | `/api/notes` | Crea `{title, content?, tags?}` |
| `GET` | `/api/notes/:id` | Una note |
| `PATCH` | `/api/notes/:id` | Actualiza campos |
| `DELETE` | `/api/notes/:id` | Borra |

Modelo en DynamoDB (una sola tabla): `PK = USER#<userId>`, `SK = NOTE#<id>`. El id empieza con la fecha en
base 36, así que las notas salen ordenadas sin índices extra.

## Costos: por qué esto es barato para empezar

| Pieza | Cómo cobra | Qué hicimos para que cueste poco |
|---|---|---|
| Lambda Web Functions | Peticiones + CPU activa + memoria de cada entorno **mientras existe** (incluye ratos ociosos) + transferencia | Escala a cero sin tráfico; **`maxEnvironments: 2`** y **`rateLimit: 100`** como topes duros |
| DynamoDB on-demand | Lecturas/escrituras por petición + GB almacenados | Sin capacidad reservada |
| CloudWatch Logs | GB ingeridos y almacenados | Retención de 7 días |
| S3 (código) | GB almacenados | Unos cuantos KB |

- Revisa los precios vigentes en la [página de precios de Lambda](https://aws.amazon.com/lambda/pricing/) y la
  [calculadora de AWS](https://calculator.aws/). Al momento de escribir esto no confirmamos si la capa gratuita
  clásica de Lambda aplica a Web Functions: no lo des por hecho.
- Si tu cuenta usa el nuevo modelo de **proyectos con límite de gasto**, configúralo: es tu red de seguridad.
- Cuentas nuevas tienen cuotas reducidas de Web Functions al inicio; suben solas con el uso.

## Seguridad: lo que este starter NO hace

- **No hay autenticación real.** El navegador manda un id anónimo en `x-user-id`; cualquiera puede falsificarlo.
  Sirve para aprender, no para datos reales. Siguiente paso: Amazon Cognito (o pídele a tu agente que lo agregue
  con [`prompts/03-agrega-una-feature.md`](prompts/03-agrega-una-feature.md)).
- El endpoint es público (`ApplicationManaged`) para que la UI abra en el navegador. Los topes de
  `maxEnvironments` y `rateLimit` limitan el costo si alguien abusa de la URL.

## Estructura

```
src/            app (Hono), repositorio de datos, UI
infra/          stack de CDK
test/           tests con Vitest (sin AWS)
scripts/        doctor.mjs: revisión del ambiente
prompts/        flujos guiados para tu agente
AGENTS.md       instrucciones para agentes (fuente única)
```

## Referencias

- [Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/lambda-web/Welcome.html)
- [Agent Toolkit for AWS](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/quick-start.html)
- [Hono](https://hono.dev) · [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) ·
  [DynamoDB: buenas prácticas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
