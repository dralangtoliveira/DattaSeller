import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EnrichmentError,
  enrichFromOpenStreetMap,
  enrichFromWebsite,
  enrichLead,
  extractContactsFromHtml,
  planEnrichmentUpdate,
} from "../lib/enrichment/provider.js";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const route = ler("../app/api/[...path]/route.ts");
const patch = ler("../scripts/production-dashboard-patch.mjs");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const publicado = ler("../public/dashboard.html");

const CHECKED_AT = "2026-09-19T18:00:00.000Z";
const NOW = () => new Date(CHECKED_AT);

const resposta = (body, { ok = true, status = 200, type = "text/html; charset=utf-8" } = {}) => ({
  ok,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? type : null) },
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

const HTML = `<!doctype html><html><head><title>Empire Szechuan — Orlando</title>
<meta name="description" content="Cozinha chinesa em Orlando"></head>
<body><a href="mailto:contato@empireszechuan.example">Fale conosco</a>
<a href="tel:+1 (407) 555-0100">Ligar</a>
<a href="https://wa.me/14075550100">WhatsApp</a>
<a href="https://www.instagram.com/empireszechuan/">Instagram</a>
<form action="/contato"><input name="email"></form>
<img src="data:image/png;base64,logo@2x.png"></body></html>`;

test("a página do lead entrega contatos reais com proveniência", () => {
  const extraido = extractContactsFromHtml(HTML, { sourceUrl: "https://empireszechuan.example/", checkedAt: CHECKED_AT });
  assert.equal(extraido.fields.email.value, "contato@empireszechuan.example");
  assert.equal(extraido.fields.telefone.value, "14075550100");
  assert.equal(extraido.fields.whatsapp.value, "14075550100");
  assert.equal(extraido.fields.instagram_url.value, "https://instagram.com/empireszechuan");
  for (const campo of Object.values(extraido.fields)) {
    assert.equal(campo.source, "site publico do lead");
    assert.equal(campo.source_url, "https://empireszechuan.example/");
    assert.equal(campo.checked_at, CHECKED_AT);
    assert.equal(campo.confidence, "high");
    assert.equal(campo.classification, "confirmado");
  }
  assert.equal(extraido.page.title, "Empire Szechuan — Orlando");
  assert.equal(extraido.page.contact_form, true);
  assert.doesNotMatch(JSON.stringify(extraido.fields), /logo@2x\.png/, "endereço de imagem não é contato");
});

test("o enriquecimento pelo site falha fechado em fonte inválida ou indisponível", async () => {
  await assert.rejects(() => enrichFromWebsite("javascript:alert(1)", { fetchImpl: async () => resposta("") }), (error) => error instanceof EnrichmentError && error.code === "enrichment_invalid_source");
  await assert.rejects(() => enrichFromWebsite("https://empresa.example/", { fetchImpl: async () => resposta("", { ok: false, status: 503 }) }), (error) => error instanceof EnrichmentError && error.code === "enrichment_source_unavailable");
  await assert.rejects(() => enrichFromWebsite("https://empresa.example/", { fetchImpl: async () => { const erro = new Error("abort"); erro.name = "AbortError"; throw erro; } }), (error) => error instanceof EnrichmentError && error.code === "enrichment_source_timeout");
  await assert.rejects(() => enrichFromWebsite("https://empresa.example/", { fetchImpl: async () => resposta("PDF", { type: "application/pdf" }) }), (error) => error instanceof EnrichmentError && error.code === "enrichment_source_unavailable");
});

const OSM_EXATO = [{
  display_name: "Empire Szechuan, 341, North Orange Avenue, Orlando, Florida, 32801, United States",
  name: "Empire Szechuan",
  osm_type: "node",
  osm_id: 940735101,
  lat: "28.5485",
  lon: "-81.3790",
  type: "restaurant",
  address: { road: "North Orange Avenue", house_number: "341", city: "Orlando", state: "Florida", postcode: "32801" },
  extratags: { website: "empireszechuanfltogo.com", phone: "+1 407-555-0101", "contact:instagram": "@empireszechuan" },
}];

test("o registro público completa o lead com fonte e classificação", async () => {
  const osm = await enrichFromOpenStreetMap({ nome: "Empire Szechuan", cidade: "Orlando, FL" }, { fetchImpl: async () => resposta(OSM_EXATO, { type: "application/json" }), now: NOW });
  assert.equal(osm.fields.site_antigo.value, "https://empireszechuanfltogo.com");
  assert.equal(osm.fields.telefone.value, "14075550101");
  assert.equal(osm.fields.instagram_url.value, "https://instagram.com/empireszechuan");
  assert.equal(osm.fields.end_cliente.value, "North Orange Avenue, 341 · Orlando, Florida · 32801");
  assert.equal(osm.fields.telefone.classification, "confirmado");
  assert.equal(osm.fields.telefone.confidence, "high");
  assert.equal(osm.fields.telefone.source, "openstreetmap");
  assert.equal(osm.fields.telefone.source_url, "https://www.openstreetmap.org/node/940735101");
  assert.equal(osm.fields.telefone.checked_at, CHECKED_AT);
  assert.equal(osm.match.exato, true);
});

test("registro apenas parecido entra como provável, para revisão humana", async () => {
  const parecido = [{ ...OSM_EXATO[0], name: "Empire Szechuan Buffet", display_name: "Empire Szechuan Buffet, Orlando" }];
  const osm = await enrichFromOpenStreetMap({ nome: "Empire Szechuan", cidade: "Orlando, FL" }, { fetchImpl: async () => resposta(parecido, { type: "application/json" }), now: NOW });
  assert.equal(osm.match.exato, false);
  assert.equal(osm.fields.telefone.classification, "provável");
  assert.equal(osm.fields.telefone.confidence, "medium");
  await assert.rejects(() => enrichFromOpenStreetMap({ nome: "Sem Registro Xyz", cidade: "Orlando, FL" }, { fetchImpl: async () => resposta([], { type: "application/json" }), now: NOW }), (error) => error instanceof EnrichmentError && error.code === "enrichment_source_empty");
});

test("o lead é enriquecido pelas duas fontes, com aviso quando uma falha", async () => {
  const fetch = async (url) => {
    if (String(url).includes("nominatim")) return resposta(OSM_EXATO, { type: "application/json" });
    return resposta(HTML);
  };
  const resultado = await enrichLead({ lead: { slug: "empire-szechuan", nome: "Empire Szechuan", cidade: "Orlando, FL", site_antigo: "https://empireszechuan.example/" }, fetchImpl: fetch, now: NOW });
  assert.equal(resultado.fields.email.value, "contato@empireszechuan.example", "o contato do site é a fonte preferencial");
  assert.equal(resultado.fields.email.source, "site publico do lead");
  assert.equal(resultado.fields.telefone.value, "14075550100");
  assert.equal(resultado.sources.length, 2);
  assert.equal(resultado.sources[0].page.contact_form, true);

  const soOsm = await enrichLead({ lead: { nome: "Empire Szechuan", cidade: "Orlando, FL", site_antigo: "https://empireszechuan.example/" }, fetchImpl: async (url) => (String(url).includes("nominatim") ? resposta(OSM_EXATO, { type: "application/json" }) : resposta("", { ok: false, status: 502 })), now: NOW });
  assert.equal(soOsm.fields.site_antigo.value, "https://empireszechuanfltogo.com");
  assert.equal(soOsm.warnings.length, 1);
  assert.equal(soOsm.warnings[0].source, "site publico do lead");

  await assert.rejects(() => enrichLead({ lead: { nome: "Empire Szechuan", cidade: "Orlando, FL", site_antigo: "https://empireszechuan.example/" }, fetchImpl: async (url) => (String(url).includes("nominatim") ? resposta([], { type: "application/json" }) : resposta("", { ok: false, status: 502 })), now: NOW }), (error) => error instanceof EnrichmentError && error.code === "enrichment_unavailable");
  await assert.rejects(() => enrichLead({ lead: { cidade: "Orlando, FL" } }), (error) => error instanceof EnrichmentError && error.code === "enrichment_invalid_lead");
});

test("valor já existente é preservado e nada é sobrescrito em silêncio", () => {
  const lead = { telefone: "(407) 555-0000", cidade: "Orlando, FL" };
  const campos = {
    telefone: { value: "14075550101", source: "openstreetmap", classification: "confirmado" },
    email: { value: "contato@empresa.example", source: "site publico do lead", classification: "confirmado" },
  };
  const { updates, ignored } = planEnrichmentUpdate(lead, campos);
  assert.deepEqual(Object.keys(updates), ["email"], "só campo vazio é preenchido");
  assert.deepEqual(ignored.map((item) => item.field), ["telefone"]);
  assert.match(ignored[0].reason, /preservado/);
  assert.deepEqual(Object.keys(planEnrichmentUpdate(lead, campos, { force: true }).updates).sort(), ["email", "telefone"]);
  assert.deepEqual(Object.keys(planEnrichmentUpdate(lead, campos, { ignorar: ["email"] }).updates), []);
});

test("a rota enriquece o lead real, preserva o que existe e falha fechado", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /if \(root === "enrichment"\) \{/);
  assert.match(post, /enrichLead\(\{ lead \}\)/);
  assert.match(post, /planEnrichmentUpdate\(lead, enrichment\.fields/);
  assert.match(post, /lead_preservado: true/, "falha de fonte precisa declarar que o lead não foi alterado");
  assert.match(post, /\}, 503\)/);
  assert.match(post, /if \(!lead\) return out\(\{ error: "lead_not_found" \}, 404\);/);
  assert.match(post, /contact_evidence: \[\.\.\.evidence/);
  assert.match(post, /"enrichment\.applied"/);
  const bloco = post.slice(post.indexOf('if (root === "enrichment")'), post.indexOf('if (root === "prospects")'));
  assert.doesNotMatch(bloco, /delete\(/, "enriquecimento nunca remove o lead");
  assert.match(bloco, /if \(updateError\) return storageUnavailable\(\);/);
});

test("o CRM oferece enriquecer no lead e o artefato publicado mantém a ação", () => {
  assert.match(patch, /dsEnriquecer\(decodeURIComponent/);
  assert.match(poc, /function dsEnriquecer\(slug\)/);
  assert.match(poc, /fetch\('\/api\/enrichment'/);
  assert.match(poc, /O lead não foi alterado/);
  assert.ok(publicado.includes("dsEnriquecer"), "o CRM publicado precisa expor a ação de enriquecimento");
  assert.match(publicado, /\/api\/enrichment/);
});

test("o enriquecimento não embute dado de empresa no código", () => {
  const provider = ler("../lib/enrichment/provider.js");
  assert.doesNotMatch(provider, /Empire Szechuan|empireszechuan/, "nenhum resultado de exemplo pode estar embutido");
  assert.match(provider, /fetchImpl = fetch/);
  assert.match(provider, /classification: exact \? "confirmado" : "provável"/);
});
