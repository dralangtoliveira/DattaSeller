#!/usr/bin/env node
// Bootstrap do Supabase de homologação (HML) do DattaSeller.
//
//   node scripts/hml-bootstrap.mjs check     # somente leitura: token, projetos, plano visível
//   node scripts/hml-bootstrap.mjs plan      # imprime o plano ordenado, sem executar nada
//   node scripts/hml-bootstrap.mjs apply     # executa o plano (exige HML_APPLY=yes e token com permissão)
//
// Regras: nunca imprimir segredo; nunca tocar Production; só cria HML quando o
// custo é zero (plano free / dentro do que o plano já cobre); migrations
// canônicas na ordem; admin E2E criado pela Auth Admin API com senha aleatória
// local (nunca impressa); falha fechado quando falta permissão.
import { readFileSync, readdirSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const ROOT = process.cwd();
const HML_NAME = process.env.HML_PROJECT_NAME ?? "dattaseller-hml";
const HML_REGION = process.env.HML_REGION ?? "sa-east-1";
const PRODUCTION_REF = "vkvkzoulbljampcbxaim";
const API = "https://api.supabase.com/v1";
const MIGRATIONS = ["db/migrations/001_commercial_core.sql", "db/migrations/002_lead_identity.sql", "db/migrations/003_recommendation_feedback.sql", "supabase/migrations/20260914031102_dattaseller_web_schema.sql"];

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    const line = readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/).find(l => l.startsWith("SUPABASE_ACCESS_TOKEN="));
    if (line) return line.slice("SUPABASE_ACCESS_TOKEN=".length).trim();
  } catch { /* sem .env.local */ }
  return null;
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 200) }; }
  return { ok: response.ok, status: response.status, data: parsed };
}

function plannedSteps(ref) {
  return [
    `1. criar projeto ${HML_NAME} (${HML_REGION}) — somente se custo adicional = 0`,
    `2. aplicar migrations canônicas na ordem: ${MIGRATIONS.join(" → ")}`,
    "3. validar RLS/policies e a existência de ds_users/ds_settings/leads/proposals/orders",
    "4. upsert ds_settings: email_provider='resend' + remetente de homologação",
    "5. criar admin E2E via Auth Admin API e linha em ds_users.role='admin' (senha aleatória local, nunca impressa)",
    "6. apontar SOMENTE o target preview da Vercel para NEXT_PUBLIC_SUPABASE_URL/_PUBLISHABLE_KEY do HML",
    "7. redeploy do Preview e provar login/health pela aplicação",
    `8. E2E: DS_E2E_BASE_URL=<preview>, DS_E2E_EMAIL=<admin hml>, DS_E2E_PASSWORD=<local>, DS_E2E_EMAIL_TO=<caixa controlada>, DS_E2E_CONFIRM=yes (ref hml=${ref ?? "<a criar>"})`,
  ];
}

async function check() {
  if (!token()) { console.error("token ausente: defina SUPABASE_ACCESS_TOKEN ou use .env.local"); process.exit(3); }
  const orgs = await api("/organizations");
  const projects = await api("/projects");
  console.log(`organizações visíveis: ${Array.isArray(orgs.data) ? orgs.data.length : "erro " + orgs.status}`);
  const list = Array.isArray(projects.data) ? projects.data : [];
  console.log(`projetos visíveis: ${list.length}`);
  for (const project of list) console.log(`- ref=${project.id} name=${project.name} region=${project.region} status=${project.status}`);
  const existing = list.find(project => project.name === HML_NAME);
  console.log(`HML existente: ${existing ? `SIM (${existing.id})` : "NÃO"}`);
  console.log(`pode ler organização: ${orgs.ok ? "sim" : `não (${orgs.status})`}`);
  console.log(`aviso: Production=${PRODUCTION_REF} nunca é alvo deste script`);
  return { existing, canCreate: orgs.ok && projects.ok };
}

async function apply() {
  if (process.env.HML_APPLY !== "yes") { console.error("apply exige HML_APPLY=yes (proteção contra execução acidental)"); process.exit(2); }
  const { existing } = await check();
  let ref = existing?.id;
  if (!ref) {
    const password = randomBytes(24).toString("base64url");
    const created = await api("/projects", { method: "POST", body: { name: HML_NAME, organization_id: process.env.HML_ORG_ID, region: HML_REGION, db_pass: password, plan: "free" } });
    if (!created.ok) { console.error(`criação recusada (${created.status}) — requerer token com permissão de criação`); process.exit(4); }
    ref = created.data.id;
    appendFileSync(join(ROOT, ".env.local"), `\nSUPABASE_HML_DB_PASSWORD=${password}\n`);
    console.log(`projeto criado: ref=${ref} (senha guardada apenas em .env.local)`);
  }
  for (const file of MIGRATIONS) {
    const sql = readFileSync(join(ROOT, file), "utf8");
    const result = await api(`/projects/${ref}/database/query`, { method: "POST", body: { query: sql } });
    console.log(`${result.ok ? "OK" : `FALHA(${result.status})`} ${file}`);
    if (!result.ok) process.exit(5);
  }
  const settings = await api(`/projects/${ref}/database/query`, { method: "POST", body: { query: "select key, value from public.ds_settings where key in ('email_provider','email_sender') order by key" } });
  console.log(`ds_settings: ${settings.ok ? JSON.stringify(settings.data).slice(0, 200) : `FALHA(${settings.status})`}`);
  console.log("Próximos passos manuais/automatizados:", plannedSteps(ref).join(" | "));
}

const command = process.argv[2] ?? "check";
if (command === "check") await check();
else if (command === "plan") { const { existing } = await check(); console.log(plannedSteps(existing?.id)); }
else if (command === "apply") await apply();
else { console.error("uso: node scripts/hml-bootstrap.mjs [check|plan|apply]"); process.exit(2); }
