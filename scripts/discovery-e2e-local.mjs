/**
 * Teste funcional do DS-VALUE-01 (descoberta) e do DS-VALUE-02 (enriquecimento)
 * pela linha web (HTTP real, Next dev).
 *
 * Sobe o CRM local apontado para um stub Supabase em memória (nenhuma base
 * real é tocada) e executa o fluxo do operador:
 *   nicho + cidade → POST /api/discovery (fonte pública real)
 *   → POST /api/prospects (o mesmo contrato do dashboard)
 *   → GET /api/leads (persistência com origem e data)
 *   → POST /api/enrichment (fontes públicas + proveniência por campo, sem
 *     sobrescrever o que já existe).
 *
 * Os provedores NÃO são simulados: a busca e o enriquecimento consultam fontes
 * públicas de verdade. O stub substitui apenas o banco já existente e comprovado.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const APP_PORT = Number(process.env.DISCOVERY_E2E_PORT ?? 3988);
const NICHO = process.env.DISCOVERY_E2E_NICHO ?? "restaurante";
const CIDADE = process.env.DISCOVERY_E2E_CIDADE ?? "Orlando, FL";
const QUANTIDADE = Number(process.env.DISCOVERY_E2E_QUANTIDADE ?? 3);

function startStub() {
  const state = { leads: new Map(), calls: [] };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let body = "";
    for await (const chunk of request) body += chunk;
    state.calls.push({ method: request.method, path: url.pathname, query: url.search });
    const send = (payload, status = 200) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(payload));
    };
    if (url.pathname.startsWith("/auth/v1/user")) {
      return send({ id: USER_ID, aud: "authenticated", role: "authenticated", email: "e2e-local@dattaseller.invalid" });
    }
    if (url.pathname.startsWith("/auth/v1/")) {
      return send({ access_token: "stub-access-token", token_type: "bearer", expires_in: 3600, refresh_token: "stub-refresh-token", user: { id: USER_ID, email: "e2e-local@dattaseller.invalid" } });
    }
    if (url.pathname === "/rest/v1/ds_users") return send({ role: "admin" });
    if (url.pathname === "/rest/v1/ds_settings") return send([{ key: "company_name", value: "STUB DISCOVERY E2E" }]);
    if (url.pathname === "/rest/v1/ds_leads") {
      if (request.method !== "GET") {
        const parsed = JSON.parse(body || "[]");
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        const filtro = url.searchParams.get("slug")?.replace(/^eq\./, "") ?? null;
        for (const row of rows) {
          const slug = row.slug ?? filtro;
          state.leads.set(slug, { ...(state.leads.get(slug) ?? {}), ...row, slug });
        }
        response.writeHead(204);
        return response.end();
      }
      const filtro = url.searchParams.get("slug")?.replace(/^eq\./, "") ?? null;
      const rows = [...state.leads.values()].filter((row) => (filtro ? row.slug === filtro : true));
      // maybeSingle() pede um objeto único; o PostgREST responde 406 quando não
      // há exatamente uma linha.
      if (String(request.headers.accept ?? "").includes("vnd.pgrst.object")) {
        return rows.length === 1 ? send(rows[0]) : send({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, 406);
      }
      return send(rows);
    }
    if (url.pathname.startsWith("/rest/v1/")) return send([]);
    return send({});
  });
  server.listen(0, "127.0.0.1");
  return { server, state };
}

function sessionCookie(baseUrl) {
  const ref = new URL(baseUrl).hostname.split(".")[0];
  const session = {
    access_token: "stub-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "stub-refresh-token",
    user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "e2e-local@dattaseller.invalid" },
  };
  return `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

async function waitForServer(url, attempts = 90) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch {
      /* ainda subindo */
    }
    await delay(1000);
  }
  return false;
}

const stub = startStub();
await once(stub.server, "listening");
const stubUrl = `http://127.0.0.1:${stub.server.address().port}`;

const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(APP_PORT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: stubUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable-key",
      SUPABASE_SECRET_KEY: "stub-secret-key",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let log = "";
next.stdout.on("data", (chunk) => { log += chunk.toString(); });
next.stderr.on("data", (chunk) => { log += chunk.toString(); });

const cleanup = () => {
  try { next.kill(); } catch { /* já encerrado */ }
  try { stub.server.close(); } catch { /* já encerrado */ }
};

const resumo = { etapa: "startup", app: `http://127.0.0.1:${APP_PORT}`, base: stubUrl, nicho: NICHO, cidade: CIDADE };
try {
  if (!(await waitForServer(`http://127.0.0.1:${APP_PORT}/login`))) {
    throw new Error("o CRM local não subiu a tempo");
  }
  const cookie = sessionCookie(stubUrl);
  const call = async (path, init = {}) => {
    const response = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, {
      ...init,
      redirect: "manual",
      headers: { Cookie: cookie, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* resposta não JSON */ }
    return { status: response.status, json, text };
  };

  // Guarda de isolamento: se o app não estiver falando com o stub, nada é escrito.
  resumo.etapa = "guarda de isolamento";
  const settings = await call("/api/settings");
  if (settings.status !== 200 || settings.json?.company_name !== "STUB DISCOVERY E2E") {
    throw new Error(`o CRM local não está isolado no stub (settings: ${settings.status})`);
  }
  const leadsBefore = await call("/api/leads");
  if (leadsBefore.status !== 200 || !Array.isArray(leadsBefore.json) || leadsBefore.json.length !== 0) {
    throw new Error(`a base do teste não está vazia (leads: ${leadsBefore.status}) — abortado sem escrever`);
  }
  if (!stub.state.calls.some((entry) => entry.path === "/rest/v1/ds_leads")) {
    throw new Error("o stub isolado não recebeu a leitura de leads — abortado sem escrever");
  }

  resumo.etapa = "descoberta";
  const descoberta = await call("/api/discovery", { method: "POST", body: JSON.stringify({ nicho: NICHO, cidade: CIDADE, quantidade: QUANTIDADE }) });
  if (descoberta.status !== 200 || !Array.isArray(descoberta.json?.results) || !descoberta.json.results.length) {
    throw new Error(`a descoberta não devolveu empresas reais (status ${descoberta.status}: ${descoberta.json?.error ?? descoberta.text.slice(0, 200)})`);
  }
  const candidatos = descoberta.json.results;
  for (const candidato of candidatos) {
    if (!/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(String(candidato.source_url))) {
      throw new Error(`candidato sem origem rastreável: ${candidato.nome}`);
    }
  }
  resumo.descoberta = {
    provider: descoberta.json.provider,
    strategy: descoberta.json.strategy,
    localidade: descoberta.json.place?.nome ?? null,
    retornadas: descoberta.json.returned,
    exemplos: candidatos.slice(0, QUANTIDADE).map((candidato) => ({
      nome: candidato.nome,
      cidade: candidato.cidade,
      telefone: candidato.telefone || null,
      website: candidato.site_antigo || null,
      categoria: candidato.proveniencia?.categoria || null,
      fonte: candidato.source_url,
      deduplicated: candidato.deduplicated,
    })),
  };

  resumo.etapa = "persistência pelo contrato do dashboard";
  const query = { niche: NICHO, city: CIDADE, region: "", product: "", target_quantity: QUANTIDADE, search_limit: QUANTIDADE };
  const primeiro = await call("/api/prospects", { method: "POST", body: JSON.stringify({ query, candidates: candidatos.slice(0, QUANTIDADE) }) });
  if (primeiro.status !== 200 || primeiro.json?.evaluated !== Math.min(QUANTIDADE, candidatos.length)) {
    throw new Error(`a persistência falhou (status ${primeiro.status}: ${primeiro.json?.error ?? primeiro.text.slice(0, 200)})`);
  }
  resumo.persistencia = primeiro.json.results.map((result) => ({ lead: result.lead, deduplicated: result.deduplicated }));

  resumo.etapa = "deduplicação";
  const segundo = await call("/api/prospects", { method: "POST", body: JSON.stringify({ query, candidates: candidatos.slice(0, QUANTIDADE) }) });
  if (segundo.status !== 200 || !segundo.json?.results?.every((result) => result.deduplicated === true && result.lead === primeiro.json.results.find((first) => first.lead === result.lead)?.lead)) {
    throw new Error("a segunda passada não reconciliou os mesmos leads (risco de duplicidade)");
  }
  resumo.deduplicacao = segundo.json.results.map((result) => ({ lead: result.lead, criterion: result.criterion }));

  resumo.etapa = "leitura do CRM";
  const leads = await call("/api/leads");
  if (leads.status !== 200 || leads.json.length !== Math.min(QUANTIDADE, candidatos.length)) {
    throw new Error(`o CRM não devolveu os leads persistidos (status ${leads.status}, total ${leads.json?.length})`);
  }
  const persistidos = leads.json.map((lead) => ({
    slug: lead.slug,
    nome: lead.nome,
    cidade: lead.cidade,
    fonte: lead.source,
    source_url: lead.source_url,
    source_checked_at: lead.source_checked_at,
    public_contact_type: lead.public_contact_type,
    endereco: lead.end_cliente,
    evidencia: lead.contact_evidence,
  }));
  if (persistidos.some((lead) => lead.fonte !== "openstreetmap" || !lead.source_url || !lead.source_checked_at)) {
    throw new Error("lead persistido sem origem/data de verificação");
  }
  resumo.persistidos = persistidos;

  // DS-VALUE-02 — enriquecimento real do lead persistido: fontes públicas,
  // proveniência por campo e preservação do que já existe.
  resumo.etapa = "enriquecimento";
  const enriquecer = async (slug) => {
    const resposta = await call("/api/enrichment", { method: "POST", body: JSON.stringify({ lead_slug: slug }) });
    if (resposta.status !== 200 || !resposta.json?.ok) {
      throw new Error(`o enriquecimento de ${slug} falhou (status ${resposta.status}: ${resposta.json?.error ?? resposta.text.slice(0, 200)})`);
    }
    for (const campo of resposta.json.updated ?? []) {
      if (!campo.source || !campo.checked_at || !campo.confidence || !campo.classification) {
        throw new Error(`campo enriquecido sem proveniência completa: ${campo.field}`);
      }
    }
    return resposta.json;
  };
  const porLead = [];
  for (const lead of persistidos) {
    const resultado = await enriquecer(lead.slug);
    porLead.push({
      lead: lead.slug,
      campos: (resultado.updated ?? []).map((campo) => ({ field: campo.field, value: campo.value, source: campo.source, source_url: campo.source_url, classification: campo.classification, confidence: campo.confidence })),
      preservados: (resultado.ignored ?? []).map((item) => item.field),
      fontes: (resultado.sources ?? []).map((origem) => origem.source),
    });
  }
  // Lead incompleto (entrada manual permitida como alternativa) enriquecido por
  // fonte pública real: prova o aceite do gate, que começa em lead incompleto.
  const criado = await call("/api/leads", { method: "POST", body: JSON.stringify({ slug: "empire-szechuan", nome: "Empire Szechuan", cidade: "Orlando, FL", source: "manual", source_url: "https://www.openstreetmap.org/node/940735101" }) });
  if (criado.status !== 200) throw new Error(`não foi possível criar o lead de teste (status ${criado.status})`);
  const incompleto = await enriquecer("empire-szechuan");
  const camposNovos = incompleto.updated ?? [];
  if (!camposNovos.length) throw new Error("o lead incompleto não recebeu nenhum dado público");
  resumo.enriquecimento = { leads_descobridos: porLead, lead_incompleto: { lead: "empire-szechuan", campos: camposNovos.map((campo) => ({ field: campo.field, value: campo.value, source: campo.source, classification: campo.classification, confidence: campo.confidence })), fontes: (incompleto.sources ?? []).map((origem) => origem.source) } };

  resumo.etapa = "enriquecimento não sobrescreve";
  const antes = (await call("/api/leads")).json.find((lead) => lead.slug === "empire-szechuan") ?? {};
  const repetido = await enriquecer("empire-szechuan");
  const sobrescritos = (repetido.updated ?? []).filter((campo) => String(antes[campo.field] ?? "").trim() !== "");
  if (sobrescritos.length) throw new Error(`a segunda passada sobrescreveu campo já preenchido: ${sobrescritos.map((campo) => campo.field).join(", ")}`);
  resumo.enriquecimento_repetido = {
    atualizados: (repetido.updated ?? []).map((campo) => campo.field),
    preservados: (repetido.ignored ?? []).map((item) => item.field),
    sobrescritos: 0,
  };

  const final = await call("/api/leads");
  const leadFinal = (final.json ?? []).find((lead) => lead.slug === "empire-szechuan");
  if (!leadFinal) throw new Error("o lead desapareceu depois do enriquecimento");
  if (!Array.isArray(leadFinal.contact_evidence) || !leadFinal.contact_evidence.length) {
    throw new Error("o lead enriquecido não registrou evidência de proveniência");
  }
  resumo.lead_final = { slug: leadFinal.slug, fonte: leadFinal.source, evidencia: leadFinal.contact_evidence.length, campos: { telefone: leadFinal.telefone || null, email: leadFinal.email || null, site_antigo: leadFinal.site_antigo || null, end_cliente: leadFinal.end_cliente || null } };
  resumo.etapa = "ok";
  console.log(JSON.stringify(resumo, null, 2));
  console.error("RESULTADO: fluxo nicho+cidade → empresas reais → CRM → enriquecimento executado com dados reais de fontes públicas.");
} catch (error) {
  console.log(JSON.stringify({ ...resumo, erro: error?.message ?? String(error) }, null, 2));
  console.error(`FALHA: ${error?.message ?? error}`);
  console.error(`DIAGNOSTICO: leads no stub = ${[...stub.state.leads.keys()].join(", ") || "(vazio)"}`);
  console.error(log.split("\n").filter((line) => /error|Error|⨯/.test(line)).slice(-8).join("\n"));
  process.exitCode = 1;
} finally {
  cleanup();
}
