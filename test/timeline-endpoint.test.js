import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// O plano canônico do E2E exige GET /api/timeline nos passos `email_timeline` e
// `reload`. A trilha era apenas escrita, então estes testes travam o contrato do
// endpoint que passou a existir: autenticação, filtro validado, ordem, limite e
// o formato de saída consumido pela UI.
const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
const plan = readFileSync(new URL("../lib/e2e/plan.js", import.meta.url), "utf8");

test("o plano do E2E exige a leitura da timeline", () => {
  const leituras = plan.match(/GET \/api\/timeline/g) ?? [];
  assert.ok(leituras.length >= 1, "o plano precisa declarar GET /api/timeline");
  assert.match(plan, /email_timeline/);
  assert.match(plan, /reload/);
});

test("a rota implementa a raiz timeline sem furar a autenticação", () => {
  assert.match(route, /if \(root === "timeline"\) \{/, "a raiz timeline precisa existir no GET");
  // A barreira de sessão vale para todas as raízes comuns. A única exceção é o
  // contexto do Worker Agent (DS-VALUE-04), que exige token do worker OU sessão.
  const getStart = route.indexOf("export async function GET");
  const bloco = route.slice(getStart, route.indexOf("export async function POST"));
  assert.match(bloco, /const auth = await context\(\); if \(!auth\) return out\(\{ error: "unauthorized" \}, 401\);/);
  assert.match(bloco, /if \(root === "worker" && parts\[1\] === "context"\) \{/);
  const workerBranch = bloco.slice(bloco.indexOf('if (root === "worker"'), bloco.indexOf("const auth = await context()"));
  assert.match(workerBranch, /token === esperado/, "o contexto do worker exige token configurado no servidor");
  assert.match(workerBranch, /return out\(\{ error: "unauthorized" \}, 401\);/, "sem token válido nem sessão admin, o contexto responde 401");
});

test("o filtro por lead é opcional e validado", () => {
  assert.match(route, /const lead = new URL\(request\.url\)\.searchParams\.get\("lead"\);/);
  assert.match(route, /if \(lead && !isSafeLeadSlug\(lead\)\) return out\(\{ error: "invalid_lead_slug" \}, 400\);/);
  assert.match(route, /base\.eq\("lead_slug", lead\)/);
});

test("a consulta é ordenada, limitada e falha fechada", () => {
  assert.match(route, /\.order\("created_at", \{ ascending: false \}\)\.limit\(500\)/);
  assert.match(route, /if \(error\) return storageUnavailable\(\);/);
});

test("a saída usa o formato camelCase esperado pela UI", () => {
  assert.match(route, /leadSlug: row\.lead_slug/);
  assert.match(route, /createdAt: row\.created_at/);
  assert.match(route, /isDemo: row\.is_demo \?\? false/);
});

test("a trilha continua sendo preservada pelo cleanup do E2E", () => {
  const cleanup = readFileSync(new URL("../lib/e2e/cleanup.js", import.meta.url), "utf8");
  assert.match(cleanup, /export const AUDIT_TABLE = "ds_timeline";/);
  assert.match(cleanup, /audit_trail_preserved/);
});
