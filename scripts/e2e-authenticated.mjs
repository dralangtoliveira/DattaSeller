// Final Gate n. 4 — E2E autenticado do DattaSeller contra um ambiente real.
// Uso: DS_E2E_CONFIRM=yes DS_E2E_BASE_URL=... DS_E2E_EMAIL=... DS_E2E_PASSWORD=... \
//      NEXT_PUBLIC_SUPABASE_URL=... DS_E2E_EXPECTED_SUPABASE_REF=... \
//      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... DS_E2E_EMAIL_TO=... \
//      [DS_E2E_RUN_ID=<id>] node scripts/e2e-authenticated.mjs
//
// O script cria dados controlados de teste (um lead E2E, uma proposta, um pedido
// e um e-mail). Ele nunca apaga nada: a linha web não expõe reset de dados.
//
// Guarda obrigatória: `lib/e2e/target-guard.js` recusa o run antes de qualquer
// chamada de rede quando o banco é o de Production, quando o host é domínio de
// Production ou quando o ref esperado do HML não foi declarado/confere.
import { createServerClient } from "@supabase/ssr";
import { E2E_STEPS, e2eHeaders, e2eLeadSlug, e2eProspectCandidate, e2eRunId, summarize, validateEnv } from "../lib/e2e/plan.js";
import { formatGuardReport, guardE2eTarget } from "../lib/e2e/target-guard.js";

const env = process.env;
const check = validateEnv(env);
if (!check.ok) {
  console.error("E2E abortado: ambiente incompleto. Nada foi executado.");
  if (check.missing.length) console.error(`  ausentes: ${check.missing.join(", ")}`);
  if (check.invalid.length) console.error(`  inválidos: ${check.invalid.join(", ")} (DS_E2E_CONFIRM precisa ser "yes")`);
  process.exit(2);
}

const isolation = guardE2eTarget(env);
for (const line of formatGuardReport(isolation)) console.error(`  ${line}`);
if (!isolation.ok) {
  console.error("E2E abortado: alvo não isolado de Production. Nada foi executado.");
  process.exit(4);
}

const base = String(env.DS_E2E_BASE_URL).replace(/\/+$/, "");
const runId = e2eRunId(env.DS_E2E_RUN_ID) ?? new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const slug = e2eLeadSlug(runId);
const results = [];
const state = {};
console.log(`run_id=${runId}`);
console.log(`lead_slug=${slug}`);

const record = (id, status, detail = "") => {
  const step = E2E_STEPS.find((item) => item.id === id) ?? { id, label: id, endpoint: "" };
  results.push({ ...step, status, detail });
  const mark = status === "pass" ? "OK  " : status === "fail" ? "FALHA" : status.toUpperCase();
  console.log(`[${mark}] ${id} — ${step.label}${detail ? ` :: ${detail}` : ""}`);
};

const jar = new Map();
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => { for (const cookie of list) jar.set(cookie.name, cookie.value); },
  },
});

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: e2eHeaders({
      base,
      cookie: [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
      bypass: env.DS_E2E_BYPASS,
    }),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, text, json, contentType: response.headers.get("content-type") ?? "" };
}

const { error: authError } = await supabase.auth.signInWithPassword({ email: env.DS_E2E_EMAIL, password: env.DS_E2E_PASSWORD });
if (authError) {
  record("auth", "blocked", `login falhou: ${authError.message}`);
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(3);
}
const auth = await call("GET", "/api/leads");
if (auth.status !== 200) {
  record("auth", "blocked", `GET /api/leads devolveu ${auth.status} — o usuário precisa de ds_users.role = admin`);
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(3);
}
record("auth", "pass", `${Array.isArray(auth.json) ? auth.json.length : 0} leads visíveis`);

const candidate = e2eProspectCandidate({ slug, runId, emailTo: env.DS_E2E_EMAIL_TO });

const prospect = await call("POST", "/api/prospects", { query: { niche: "e2e", city: "Novo Hamburgo", product: "datta360", search_radius_km: 10, target_quantity: 1, search_limit: 1 }, candidates: [candidate] });
if (prospect.status !== 200) record("prospect", "fail", `HTTP ${prospect.status} ${prospect.text.slice(0, 160)}`);
else record("prospect", "pass", `${prospect.text.includes('"deduplicated":false') ? "novo" : "resposta sem flag deduplicated"}`);

const dedup = await call("POST", "/api/prospects", { query: { niche: "e2e", city: "Novo Hamburgo", product: "datta360" }, candidates: [candidate] });
if (dedup.status !== 200) record("dedup", "fail", `HTTP ${dedup.status}`);
else if (dedup.text.includes('"deduplicated":true')) record("dedup", "pass", "duplicata reconhecida");
else record("dedup", "fail", `deduplicação não reconhecida: ${dedup.text.slice(0, 160)}`);

const qualification = await call("POST", "/api/qualifications", { lead_slug: slug, facts: ["Site público sem CTA no E2E"], hypotheses: ["Validar prioridade comercial"], recommendation: "datta360", reason: "Oportunidade observada em fonte pública", confidence: "medium", validation_question: "Aumentar pedidos é prioridade?", next_action: "revisar com operador", owner: "E2E" });
record("qualification", qualification.status === 200 ? "pass" : "fail", `HTTP ${qualification.status}`);

const diagnosis = await call("POST", "/api/diagnoses", { lead_slug: slug, criteria: [{ criterion: "CTA", observed_state: "ausente", evidence: "https://e2e.example/", recommendation: "incluir CTA" }] });
record("diagnosis", diagnosis.status === 200 ? "pass" : "fail", `HTTP ${diagnosis.status}`);

const social = await call("POST", "/api/social-audits", { lead_slug: slug, platform: "instagram", url: candidate.instagram_url, username: `e2e${runId}`, factual_notes: ["perfil público controlado"], recommendation: "revisar bio", creative_direction: "manter identidade" });
record("social", social.status === 200 ? "pass" : "fail", `HTTP ${social.status}`);

const preview = await call("POST", "/api/previews", { lead_slug: slug, kind: "redesign" });
state.previewId = preview.json?.id ?? null;
record("preview", preview.status === 200 && state.previewId ? "pass" : "fail", `preview=${state.previewId ?? "-"}`);

if (state.previewId) {
  const editor = await call("GET", `/api/previews/${state.previewId}/editor`);
  record("editor", editor.status === 200 && editor.text.includes("PROSPECTOR-EDITOR") ? "pass" : "fail", `HTTP ${editor.status}`);
  const comparator = await call("GET", `/api/comparators/${slug}`);
  record("comparator", comparator.status === 200 ? "pass" : "fail", `HTTP ${comparator.status}`);
  // A rota da proposta lê os artefatos no topo do corpo (mesmo contrato da UI);
  // aninhá-los em `artifacts` deixava a proposta sem capa (409 no passo cover).
  const proposal = await call("POST", "/api/proposals", { lead_slug: slug, product_id: "datta360", preview_ids: [state.previewId], diagnosis_ids: [diagnosis.json?.id].filter(Boolean), social_audit_ids: [social.json?.id].filter(Boolean), comparator: Boolean(state.previewId) });
  state.proposalId = proposal.json?.id ?? null;
  state.publicPrice = proposal.json?.base_price ?? null;
  record("proposal", proposal.status === 200 && state.proposalId ? "pass" : "fail", `proposta=${state.proposalId ?? "-"}`);
  if (state.proposalId) {
    const above = await call("PUT", `/api/proposals/${state.proposalId}`, { negotiated_price: Number(state.publicPrice ?? 1500) + 100 });
    if (above.status !== 400 || above.json?.error !== "negotiated_price_above_public_price") record("negotiation", "fail", `preço acima do público devolveu HTTP ${above.status} ${above.text.slice(0, 120)}`);
    else {
      const negotiated = await call("PUT", `/api/proposals/${state.proposalId}`, { negotiated_price: Number(state.publicPrice ?? 1500) - 100, valid_days: 7 });
      state.negotiatedProposalId = negotiated.json?.id ?? null;
      record("negotiation", negotiated.status === 200 ? "pass" : "fail", `preço acima recusado; revisão=${state.negotiatedProposalId ?? "-"}`);
    }
    const cover = await call("GET", `/api/proposals/${state.proposalId}/cover`);
    record("cover", cover.status === 200 ? "pass" : "fail", `HTTP ${cover.status}`);
  } else record("negotiation", "skip", "sem proposta");
} else {
  record("editor", "skip", "sem preview");
  record("comparator", "skip", "sem preview");
  record("proposal", "skip", "sem preview");
  record("negotiation", "skip", "sem proposta");
  record("cover", "skip", "sem proposta");
}

const draft = await call("POST", "/api/emails", { lead_slug: slug, proposal_id: state.negotiatedProposalId ?? state.proposalId ?? null, subject: `Proposta E2E ${runId}`, body: "Mensagem de teste controlado do E2E. Revise antes do envio." });
state.emailId = draft.json?.id ?? null;
record("email_draft", draft.status === 200 && state.emailId ? "pass" : "fail", `email=${state.emailId ?? "-"}`);

if (state.emailId) {
  const edited = await call("PUT", `/api/emails/${state.emailId}`, { subject: `Proposta E2E ${runId}`, body: "Mensagem de teste controlado do E2E, revisada pelo operador." });
  record("email_edit", edited.status === 200 ? "pass" : "fail", `HTTP ${edited.status}`);
  const reviewed = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "reviewed" });
  const approved = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "approved" });
  record("email_approve", reviewed.status === 200 && approved.status === 200 ? "pass" : "fail", `reviewed=${reviewed.status} approved=${approved.status}`);
  const sent = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "sent_simulated" });
  const sendStatus = sent.json?.status ?? "?";
  if (sendStatus === "sent") record("email_send", "pass", `provider=${sent.json?.provider} id=${sent.json?.provider_message_id ?? "-"}`);
  else if (sendStatus === "failed") record("email_send", "blocked", `envio não concluído: ${sent.json?.error ?? "provider_send_failed"} (RESEND_API_KEY/domínio)`);
  else record("email_send", "fail", `HTTP ${sent.status} ${sent.text.slice(0, 140)}`);
  const followUp = await call("POST", `/api/emails/${state.emailId}/follow-up`);
  const followUpOk = followUp.status === 201 || followUp.json?.duplicate === true;
  record("email_followup", followUpOk ? "pass" : followUp.status === 409 ? "blocked" : "fail", `HTTP ${followUp.status}`);
  const timeline = await call("GET", "/api/timeline");
  // O endpoint de timeline responde em camelCase (`leadSlug`), contrato já coberto por teste.
  const events = Array.isArray(timeline.json) ? timeline.json.filter((item) => (item.leadSlug ?? item.lead_slug) === slug) : [];
  record("email_timeline", timeline.status === 200 && events.length > 0 ? "pass" : "fail", `${events.length} eventos do lead E2E`);
} else {
  for (const id of ["email_edit", "email_approve", "email_send", "email_followup", "email_timeline"]) record(id, "skip", "sem e-mail");
}

const orderSource = state.negotiatedProposalId ?? state.proposalId;
const order = orderSource ? await call("POST", "/api/orders", { proposal_id: orderSource }) : { status: 0, json: null, text: "sem proposta" };
state.orderId = order.json?.id ?? null;
record("order", state.orderId ? "pass" : "fail", state.orderId ? `pedido=${state.orderId} cupom=${order.json?.coupon_code ?? "sem desconto"}` : `HTTP ${order.status} ${order.text.slice(0, 140)}`);

if (state.orderId) {
  const checkout = await call("POST", `/api/orders/${state.orderId}/checkout`, {});
  record("checkout", checkout.status === 200 ? "pass" : "fail", `HTTP ${checkout.status}`);
  const completed = await call("POST", `/api/orders/${state.orderId}/checkout`, { result: "completed" });
  const payment = await call("POST", `/api/orders/${state.orderId}/payment`, { status: "approved" });
  record("payment", completed.status === 200 && payment.status === 200 ? "pass" : "fail", `checkout=${completed.status} pagamento=${payment.status}`);
  const contract = await call("POST", `/api/orders/${state.orderId}/contract`, {});
  state.contractId = contract.json?.id ?? null;
  if (state.contractId) {
    const html = await call("GET", `/api/contracts/${state.contractId}/html`);
    record("contract", "pass", `contrato=${state.contractId}`);
    record("contract_html", html.status === 200 && html.text.includes("Contrato") ? "pass" : "fail", `HTTP ${html.status}`);
    const docx = await call("GET", `/api/contracts/${state.contractId}/docx`);
    const isDocx = docx.status === 200 && docx.text.startsWith("PK") && docx.contentType.includes("wordprocessingml");
    record("contract_docx", isDocx ? "pass" : "fail", `HTTP ${docx.status} type=${docx.contentType}`);
  } else {
    record("contract", "fail", `HTTP ${contract.status} ${contract.text.slice(0, 140)}`);
    record("contract_html", "skip", "sem contrato");
    record("contract_docx", "skip", "sem contrato");
  }
  const handoff = await call("POST", `/api/orders/${state.orderId}/handoff`, { status: "delivered" });
  record("handoff", handoff.status === 200 ? "pass" : "fail", `HTTP ${handoff.status}`);
}

const financial = await call("GET", "/api/financial");
record("financial", financial.status === 200 && financial.json && Number(financial.json.sales) >= 0 ? "pass" : "fail", `HTTP ${financial.status} vendas=${financial.json?.sales ?? "-"} comissão=${financial.json?.commission ?? "-"}`);

const reloadLeads = await call("GET", "/api/leads");
const reloadTimeline = await call("GET", "/api/timeline");
const persisted = reloadLeads.status === 200 && Array.isArray(reloadLeads.json) && reloadLeads.json.some((lead) => lead.slug === slug) && reloadTimeline.status === 200;
record("reload", persisted ? "pass" : "fail", persisted ? "lead e timeline sobreviveram ao reload" : "lead ou timeline não persistiram");

const summary = { ...summarize(results), run_id: runId, lead_slug: slug };
console.log("\n--- resumo ---");
console.log(JSON.stringify(summary, null, 2));
if (summary.failed) console.log("fechar o Final Gate n. 4 exige zero falhas");
process.exit(summary.ok ? 0 : 1);
