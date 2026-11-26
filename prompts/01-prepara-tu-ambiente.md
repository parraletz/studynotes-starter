# 01 · Prepara tu ambiente

> Pega todo lo que está dentro del bloque en tu agente (Codex, Copilot, Claude Code, Cursor, Kiro…),
> abierto en la carpeta de este repositorio.

```
Quiero preparar mi ambiente para el proyecto StudyNotes de este repositorio. Soy nuevo en AWS:
explícame cada paso en español antes de hacerlo y pídeme confirmación antes de instalar algo
o de ejecutar algo que cambie mi cuenta de AWS.

1. Lee AGENTS.md.
2. Corre `npm install` si no existe node_modules.
3. Corre `node scripts/doctor.mjs --json` y lee el resultado.
4. Para cada check en "fail" o "warn", en este orden, explícame qué es, por qué importa y cómo
   resolverlo en MI sistema operativo. Ofrece ejecutar tú el comando si es seguro; si requiere
   interacción (como `aws login`, que abre el navegador), dime exactamente qué escribir.
   - Node.js: recomienda la versión 24 LTS.
   - AWS CLI: versión 2.35 o superior.
   - Sesión: `aws login` en la cuenta/proyecto del bootcamp. NUNCA me pidas access keys.
   - Región: una región con Lambda Web Functions (por ejemplo us-east-1).
   - CDK bootstrap: `npm run bootstrap` (explícame que crea recursos de soporte de CDK en mi cuenta).
   - Agent Toolkit for AWS: `aws configure agent-toolkit` para conectarte a mi cuenta con permisos
     y auditoría (recuérdame reiniciarte después).
5. Vuelve a correr el doctor hasta que no haya "fail".
6. Corre `npm run check` y `npm run dev`, y dime cómo abrir la app en el navegador.
7. Termina con un resumen: qué quedó instalado, qué falta (si algo) y cuál es el siguiente paso.
```

## ¿Qué deberías ver al final?

```
✅ Node.js >= 22 — v24.x
✅ Dependencias instaladas
✅ AWS CLI >= 2.35
✅ Sesión de AWS activa — cuenta 1234… · tu-usuario
✅ Región configurada
✅ CDK bootstrap en la cuenta
✅ Agent Toolkit for AWS
```

Y la app corriendo en <http://127.0.0.1:3000> con datos en memoria.
