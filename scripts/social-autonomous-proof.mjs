/**
 * Gate 1 do fechamento do PR #20 — job HTTP autônomo real.
 *
 * Envia POST /api/social com lead_slug + profile_url (SEM browser_evidence),
 * acompanha o job e busca o artefato no agente para provar que foi o próprio
 * job que abriu a página pública com a ferramenta de browser.
 *
 * Uso: node scripts/social-autonomous-proof.mjs <app_url> <cookie> <lead_slug> <profile_url> <worker_url> <worker_secret>
 */

import { writeFileSync } from "node:fs";

const [appUrl, cookie, leadSlug, profileUrl, workerUrl, workerSecret] = process.argv.slice(2);
if (!appUrl || !cookie || !leadSlug || !profileUrl) {
  console.error("uso: node scripts/social-autonomous-proof.mjs <app_url> <cookie> <lead_slug> <profile_url> [worker_url] [worker_secret]");
  process.exit(2);
}

const requisicao = { lead_slug: leadSlug, action: "ANALYZE_SOCIAL", profile_url: profileUrl };
const prova = { request: requisicao, browser_evidence_enviado: Object.prototype.hasOwnProperty.call(requisicao, "browser_evidence") };

const inicio = await fetch(`${appUrl}/api/social`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(requisicao) });
const inicioJson = await inicio.json().catch(() => null);
prova.status_http = inicio.status;
prova.job_id = inicioJson?.job_id ?? null;
prova.mode = inicioJson?.mode ?? null;
prova.action = inicioJson?.action ?? null;

let estado = null;
for (let tentativa = 0; tentativa < 30 && !estado; tentativa += 1) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const resposta = await fetch(`${appUrl}/api/social?job=${encodeURIComponent(prova.job_id)}`, { headers: { Cookie: cookie }, cache: "no-store" });
  const json = await resposta.json().catch(() => null);
  if (json?.status === "failed") { prova.erro = json.error; estado = json; break; }
  if (json?.status === "completed") estado = json;
}
prova.status_final = estado?.status ?? "nao_concluiu";
prova.auditoria_id = estado?.audit?.id ?? null;
prova.audit_handle = estado?.audit?.handle ?? null;
prova.audit_counters = estado?.audit?.counters ?? null;
prova.audit_warnings = estado?.audit?.warnings ?? null;

if (workerUrl && prova.job_id) {
  const artefato = await fetch(`${workerUrl}/jobs/${encodeURIComponent(prova.job_id)}`, { headers: workerSecret ? { "x-worker-secret": workerSecret } : {} }).then((r) => r.json()).catch(() => null);
  const a = artefato?.artifact ?? {};
  prova.evidence_source = a.evidence_source ?? null;
  prova.browser_tool = a.browser_tool ?? null;
  prova.collected_at = a.checked_at ?? null;
  prova.evidencias = Array.isArray(a.evidence) ? a.evidence.length : null;
  prova.handle = a.handle ?? null;
  prova.contadores = a.counters ?? null;
  prova.bio = a.bio ? String(a.bio).slice(0, 80) : null;
  prova.links = Array.isArray(a.links) ? a.links.slice(0, 3) : [];
  prova.formats = a.formats ?? [];
  prova.warnings = (a.warnings ?? []).map((w) => w.code);
  prova.artifact_keys = Object.keys(a).sort();
}

try { writeFileSync(".redesign-e2e/social-autonomous-proof.json", JSON.stringify(prova, null, 2), "utf8"); } catch { /* pasta ausente */ }
console.log(JSON.stringify(prova, null, 2));
const ok = prova.status_final === "completed" && prova.evidence_source === "browser" && prova.browser_evidence_enviado === false;
console.error(ok ? "GATE_1_HTTP_AUTONOMOUS: PASS" : "GATE_1_HTTP_AUTONOMOUS: FAIL");
process.exitCode = ok ? 0 : 1;
