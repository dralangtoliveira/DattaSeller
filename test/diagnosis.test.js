import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DiagnosisError, analyzeSite, diagnoseSite as diagnoseSiteReal } from "../lib/diagnosis/site.js";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
// Resolução pública injetada: o guard SSRF é exercitado sem depender de DNS real.
const RESOLVE_PUBLICO = async () => [{ address: "93.184.216.34", family: 4 }];
const diagnoseSite = (url, opcoes = {}) => diagnoseSiteReal(url, { resolveHost: RESOLVE_PUBLICO, ...opcoes });
const route = ler("../app/api/[...path]/route.ts");
const patch = ler("../scripts/production-dashboard-patch.mjs");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const publicado = ler("../public/dashboard.html");

const CHECKED_AT = "2026-09-19T19:00:00.000Z";
const HTML = `<!doctype html><html lang="pt-BR"><head>
<title>Empire Szechuan — Cozinha chinesa em Orlando</title>
<meta name="description" content="Cozinha chinesa em Orlando desde 1998">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:image" content="https://empireszechuan.example/og.jpg">
<link rel="canonical" href="https://empireszechuan.example/">
</head><body>
<h1>Empire Szechuan</h1><h2>Nosso cardápio</h2><h2>Onde estamos</h2>
<a href="/menu">Ver o cardápio</a><a href="https://wa.me/14075550100">Peça pelo WhatsApp</a>
<a href="mailto:contato@empireszechuan.example">Fale conosco</a><a href="tel:+14075550100">Ligar</a>
<a href="https://instagram.com/empireszechuan">Instagram</a>
<a href="https://www.google.com/maps">Como chegar</a>
<form action="/contato"><input name="email"></form>
<img src="/logo.png" alt="Logotipo"><img src="/foto.jpg">
</body></html>`;

const respostaHtml = (html = HTML, { status = 200, contentType = "text/html; charset=utf-8", url = "https://empireszechuan.example/" } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  url,
  headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? contentType : null) },
  text: async () => html,
});

test("o diagnóstico registra fatos verificáveis com evidência", () => {
  const analise = analyzeSite({ finalUrl: "https://empireszechuan.example/", status: 200, contentType: "text/html", html: HTML, bytes: HTML.length, checkedAt: CHECKED_AT });
  assert.equal(analise.fatos.titulo, "Empire Szechuan — Cozinha chinesa em Orlando");
  assert.equal(analise.fatos.idioma_declarado, "pt-BR");
  assert.equal(analise.fatos.viewport_declarado, true);
  assert.deepEqual(analise.fatos.titulos_h1, ["Empire Szechuan"]);
  assert.deepEqual(analise.fatos.subtitulos_h2, ["Nosso cardápio", "Onde estamos"]);
  assert.ok(analise.fatos.chamadas_para_acao.some((texto) => /Fale conosco/.test(texto)));
  assert.deepEqual(analise.fatos.contatos.email, ["contato@empireszechuan.example"]);
  assert.deepEqual(analise.fatos.contatos.telefone, ["+14075550100"]);
  assert.equal(analise.fatos.contatos.whatsapp, true);
  assert.equal(analise.fatos.contatos.formulario, true);
  assert.equal(analise.fatos.imagens.total, 2);
  assert.equal(analise.fatos.imagens.sem_alt, 1);
  assert.equal(analise.fatos.tecnologia_declarada.og_image, true);
  assert.equal(analise.evidencias.length >= 8, true);
  assert.equal(analise.evidencias.every((item) => item.criterio && item.observacao), true);
  assert.equal(analise.checked_at, CHECKED_AT);
});

test("o diagnóstico não afirma problema técnico sem teste", () => {
  const analise = analyzeSite({ finalUrl: "https://sem-cta.example/", status: 200, contentType: "text/html", html: "<html><head><title>Só título</title></head><body><img src='a.png'></body></html>", bytes: 60, checkedAt: CHECKED_AT });
  const texto = JSON.stringify(analise);
  for (const proibido of ["lento", "inseguro", "vulnerável", "SEO ruim", "perde cliente", "hospedagem fraca"]) {
    assert.doesNotMatch(texto, new RegExp(proibido, "i"), `o diagnóstico não pode afirmar "${proibido}" sem teste`);
  }
  assert.equal(analise.fatos.viewport_declarado, false);
  assert.equal(analise.fatos.chamadas_para_acao.length, 0);
  const cta = analise.evidencias.find((item) => item.criterio === "cta");
  assert.match(cta.observacao, /Nenhum texto de chamada para ação reconhecido/);
});

test("site indisponível falha fechado, sem diagnóstico inventado", async () => {
  await assert.rejects(() => diagnoseSite("javascript:alert(1)", { fetchImpl: async () => respostaHtml() }), (error) => error instanceof DiagnosisError && error.code === "diagnosis_invalid_url");
  await assert.rejects(() => diagnoseSite("https://fora.example/", { fetchImpl: async () => respostaHtml("", { status: 502 }) }), (error) => error instanceof DiagnosisError && error.code === "diagnosis_http_error");
  await assert.rejects(() => diagnoseSite("https://outro.example/", { fetchImpl: async () => respostaHtml("PDF", { contentType: "application/pdf" }) }), (error) => error instanceof DiagnosisError && error.code === "diagnosis_not_html");
  await assert.rejects(() => diagnoseSite("https://timeout.example/", { fetchImpl: async () => { const erro = new Error("abort"); erro.name = "AbortError"; throw erro; } }), (error) => error instanceof DiagnosisError && error.code === "diagnosis_timeout");
  await assert.rejects(() => diagnoseSite("https://dns.example/", { fetchImpl: async () => { throw new Error("ENOTFOUND"); } }), (error) => error instanceof DiagnosisError && error.code === "diagnosis_unavailable");
});

test("o diagnóstico da página real usa a URL final e registra verificação", async () => {
  const resultado = await diagnoseSite("https://empireszechuan.example", { fetchImpl: async () => respostaHtml(HTML, { url: "https://empireszechuan.example/" }), now: () => new Date(CHECKED_AT) });
  assert.equal(resultado.url, "https://empireszechuan.example");
  assert.equal(resultado.fatos.url_final, "https://empireszechuan.example/");
  assert.equal(resultado.checked_at, CHECKED_AT);
  assert.equal(resultado.fatos.http_status, 200);
  assert.equal(resultado.fatos.tamanho_bytes, HTML.length);
});

test("a rota grava o diagnóstico do site real e falha fechado", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /if \(root === "diagnosis"\) \{/);
  assert.match(post, /diagnoseSite\(lead\.site_antigo\)/);
  assert.match(post, /ds_site_diagnoses"\)\.insert\(row\)/);
  assert.match(post, /site_audit_json: JSON\.stringify\(criteria\)/);
  assert.match(post, /"site\.diagnosis"/);
  assert.match(post, /lead_preservado: true/);
  const bloco = post.slice(post.indexOf('if (root === "diagnosis")'), post.indexOf('if (root === "prospects")'));
  assert.match(bloco, /if \(!lead\) return out\(\{ error: "lead_not_found" \}, 404\);/);
  assert.match(bloco, /if \(insertError\) return storageUnavailable\(\);/);
  assert.doesNotMatch(bloco, /"lento"|"inseguro"|SEO ruim/, "a rota não pode afirmar problema sem teste");
  assert.match(bloco, /startsWith\("ssrf_"\) \? 400 : 503/, "site privado precisa ser recusado com 400 antes de qualquer fetch");
});

test("o CRM oferece o diagnóstico factual por lead", () => {
  assert.match(patch, /dsDiagnostico\(decodeURIComponent/);
  assert.match(poc, /function dsDiagnostico\(slug\)/);
  assert.match(poc, /fetch\('\/api\/diagnosis'/);
  assert.match(poc, /O lead não foi alterado/);
  assert.ok(publicado.includes("dsDiagnostico"), "o CRM publicado precisa expor a ação de diagnóstico");
});

test("o diagnóstico não embute site nem resultado de exemplo no código", () => {
  const provider = ler("../lib/diagnosis/site.js");
  assert.doesNotMatch(provider, /empireszechuan|Empire Szechuan/);
  assert.match(provider, /fetchImpl = fetch/);
  assert.match(provider, /diagnosis_unavailable/);
});
