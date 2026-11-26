#!/usr/bin/env node
// Revisa que tu ambiente esté listo para StudyNotes. Funciona en macOS, Linux y Windows.
// Uso: npm run doctor   (o: node scripts/doctor.mjs --json para que lo lea un agente)
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const asJson = process.argv.includes("--json");
const results = [];

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], timeout: 20_000 }).toString().trim();
  } catch {
    return null;
  }
}

function versionAtLeast(found, min) {
  const a = found.split(".").map(Number);
  const b = min.split(".").map(Number);
  for (let i = 0; i < b.length; i++) {
    if ((a[i] ?? 0) > b[i]) return true;
    if ((a[i] ?? 0) < b[i]) return false;
  }
  return true;
}

function check(name, required, fn, fix) {
  let status = "ok";
  let detail = "";
  try {
    const r = fn();
    if (r === false || r == null) status = required ? "fail" : "warn";
    else detail = String(r);
  } catch (e) {
    status = required ? "fail" : "warn";
    detail = e.message;
  }
  results.push({ name, status, detail, fix: status === "ok" ? undefined : fix });
}

// 1. Node.js
check("Node.js >= 22", true, () => {
  const v = process.versions.node;
  if (!versionAtLeast(v, "22.0.0")) throw new Error(`tienes ${v}`);
  return `v${v}${versionAtLeast(v, "24.0.0") ? "" : " (recomendado: 24, el mismo runtime que en AWS)"}`;
}, "Instala Node.js 24 LTS: https://nodejs.org (o con nvm/fnm: `fnm install 24`).");

// 2. Dependencias del proyecto
check("Dependencias instaladas", true, () => (existsSync("node_modules/aws-cdk-lib") ? "node_modules" : null),
  "Corre `npm install` en la raíz del proyecto.");

// 3. AWS CLI
let awsVersion = null;
check("AWS CLI >= 2.35", true, () => {
  const out = run("aws --version");
  if (!out) return null;
  awsVersion = out.match(/aws-cli\/(\d+\.\d+\.\d+)/)?.[1];
  if (!awsVersion || !versionAtLeast(awsVersion, "2.35.0")) throw new Error(`tienes ${awsVersion ?? out}`);
  return awsVersion;
}, "Instala o actualiza AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html");

// 4. Comando lambda-web (Lambda Web Functions) en la CLI
check("AWS CLI con `aws lambda-web`", false, () => run("aws lambda-web help") !== null || null,
  "Actualiza la AWS CLI a la última versión. El deploy con CDK funciona igual; esto solo es para inspeccionar desde la terminal.");

// 5. Sesión de AWS
let identity = null;
check("Sesión de AWS activa", true, () => {
  const out = run("aws sts get-caller-identity --output json");
  if (!out) return null;
  identity = JSON.parse(out);
  return `cuenta ${identity.Account} · ${identity.Arn.split("/").slice(-1)[0]}`;
}, "Inicia sesión: `aws login` (credenciales temporales). Nunca uses access keys de larga duración.");

// 6. Región
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || run("aws configure get region");
check("Región configurada", false, () => region || null,
  "Configura una región con Lambda Web Functions, por ejemplo: `aws configure set region us-east-1`.");

// 7. CDK bootstrap en la cuenta/región
check("CDK bootstrap en la cuenta", false, () => {
  if (!identity || !region) return null;
  const out = run(`aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region} --query "Stacks[0].StackStatus" --output text`);
  return out && out.endsWith("COMPLETE") ? `CDKToolkit ${out} (${region})` : null;
}, "Corre `npm run bootstrap` una vez por cuenta y región.");

// 8. Agent Toolkit for AWS (opcional pero recomendado)
check("Agent Toolkit for AWS", false, () => {
  const out = run("aws agent-toolkit list-installed-skills");
  return out !== null ? "skills instaladas" : null;
}, "Conecta tu agente a AWS: `aws configure agent-toolkit` (detecta Kiro, Claude Code, Codex, Cursor…).");

// 9. uv (lo usa el proxy SigV4 del AWS MCP Server)
check("uv (para el AWS MCP Server con SigV4)", false, () => run("uv --version"),
  "Instala uv: https://docs.astral.sh/uv/getting-started/installation/ (solo si usas SigV4; con OAuth no hace falta).");

// ── Salida ───────────────────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === "fail");
if (asJson) {
  console.log(JSON.stringify({ ready: failed.length === 0, results }, null, 2));
} else {
  const icon = { ok: "✅", warn: "⚠️ ", fail: "❌" };
  console.log("\nStudyNotes · revisión de ambiente\n");
  for (const r of results) {
    console.log(`${icon[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    if (r.fix) console.log(`   → ${r.fix}`);
  }
  console.log(failed.length ? `\n${failed.length} problema(s) por resolver antes de desplegar.\n` : "\nTodo listo. Siguiente: `npm run dev` o `npm run deploy`.\n");
}
process.exit(failed.length ? 1 : 0);
