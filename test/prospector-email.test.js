import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildProspectorDraft, diagnosisFactsFromCriteria, validateProspectorDraft } from "../lib/email/prospector-draft.js";

test("gera rascunho Prospector com pergunta, 120-180 palavras e link único", () => {
  const draft = buildProspectorDraft({ businessName: "Empresa Exemplo", firstLine: "Vi a apresentação pública da Empresa Exemplo e gostei da forma como vocês explicam o atendimento.", diagnosis: ["O contato está publicado, mas a chamada principal não aparece logo no início.", "A página tem informações úteis, porém a hierarquia pode deixar o serviço mais fácil de entender."], publicUrl: "https://propostas.example.com/p/abc", sellerName: "Ana", identity: "DattaSeller", whatsapp: "+5511999999999" });
  assert.equal(validateProspectorDraft({ ...draft, publicUrl: "https://propostas.example.com/p/abc" }), null);
  assert.ok(draft.subject.endsWith("?"));
});

test("a checklist bloqueia gatilhos, mais de um link e texto fora do tamanho", () => {
  assert.equal(validateProspectorDraft({ subject: "Oferta urgente?", body: "https://a.example https://b.example", publicUrl: "https://a.example" }), "prospector_word_count_invalid");
  const body = `${Array.from({ length: 130 }, () => "texto").join(" ")} https://a.example`;
  assert.equal(validateProspectorDraft({ subject: "Empresa, posso mostrar algo?", body, publicUrl: "https://c.example" }), "prospector_link_invalid");
});

test("a rota autenticada exige proposta pública e base URL aprovada antes de persistir", () => {
  const route = readFileSync(new URL("../app/api/proposals/[id]/prospector-draft/route.ts", import.meta.url), "utf8");
  assert.match(route, /public_proposal_required/);
  assert.match(route, /public_proposal_incomplete/);
  assert.match(route, /publicProposalReadiness/);
  assert.match(route, /public_base_url_required/);
  assert.match(route, /buildProspectorDraft/);
  assert.match(route, /email\.prospector_draft/);
});

test("a URL pública é uma configuração permitida, nunca um segredo", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /"public_base_url"/);
});

test("a Central permite configurar a origem HTTPS das propostas públicas", () => {
  const patch = readFileSync(new URL("../scripts/production-dashboard-patch.mjs", import.meta.url), "utf8");
  assert.match(patch, /set-public-base-url/);
  assert.match(patch, /dsSavePublicBaseUrl/);
  assert.match(patch, /origem HTTPS/);
});

test("a Central cria o rascunho pelo endpoint Prospector, sem fallback genérico", () => {
  const patch = readFileSync(new URL("../scripts/production-dashboard-patch.mjs", import.meta.url), "utf8");
  assert.match(patch, /prospector-draft/);
  assert.match(patch, /dsEmail=function/);
});


test("DS-VALUE-08 extrai fatos do formato real persistido pelo DS-VALUE-03", () => {
  const facts = diagnosisFactsFromCriteria({
    url: "https://empresa.example/",
    checked_at: "2026-09-22T03:59:15.359Z",
    evidencias: [
      { criterio: "resposta_http", observacao: "GET https://empresa.example/ respondeu 200", valor: "200" },
      { criterio: "titulo", observacao: "Título declarado: Empresa Exemplo", valor: "Empresa Exemplo" },
    ],
  });
  assert.deepEqual(facts, ["GET https://empresa.example/ respondeu 200", "Título declarado: Empresa Exemplo"]);
});

test("DS-VALUE-08 mantém compatibilidade com critério controlado antigo", () => {
  assert.deepEqual(diagnosisFactsFromCriteria([{ criterion: "CTA", observed_state: "ausente" }]), ["CTA: ausente"]);
});

test("rota Prospector usa o extrator factual antes de gerar o rascunho", () => {
  const route = readFileSync(new URL("../app/api/proposals/[id]/prospector-draft/route.ts", import.meta.url), "utf8");
  assert.match(route, /diagnosisFactsFromCriteria/);
  assert.match(route, /No diagnóstico de/);
});
