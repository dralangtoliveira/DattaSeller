import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildProspectorEmailDraft, publicProposalTokenFromUrl } from "../lib/email/prospector.js";

const link = "https://hml.example/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
test("DS-VALUE-08 cria rascunho Datta360° limpo, revisável e com um único link", () => {
  const draft = buildProspectorEmailDraft({ leadName: "Ana", companyName: "Empresa", diagnosisFact: "CTA principal não foi localizado na página inicial.", publicProposalUrl: link, sellerName: "João" });
  const count = draft.body.trim().split(/\s+/).length;
  assert.equal(draft.status, "draft");
  assert.ok(draft.subject.length <= 60);
  assert.match(draft.subject, /\?$/);
  assert.match(draft.body.split("\n")[0], /CTA principal/);
  assert.match(draft.body, /demonstração preparada/);
  assert.ok(count >= 120 && count <= 180);
  assert.equal((draft.body.match(/https:\/\//g) ?? []).length, 1);
  assert.doesNotMatch(draft.body, /preço|valor|r\$|desconto|cupom|promoção/i);
  assert.equal(publicProposalTokenFromUrl(link).length, 43);
});

test("assunto do rascunho não excede sessenta caracteres", () => {
  const draft = buildProspectorEmailDraft({ leadName: "Ana", companyName: "Empresa com nome deliberadamente muito longo para a regra", diagnosisFact: "CTA ausente.", publicProposalUrl: link });
  assert.ok(draft.subject.length <= 60);
});

test("gerador recusa contexto ou URL de capability incompletos", () => {
  assert.throws(() => buildProspectorEmailDraft({ leadName: "Ana", companyName: "Empresa", diagnosisFact: "Fato", publicProposalUrl: "https://hml.example/p/curto" }), /public_proposal_url_required/);
});

test("rota autenticada valida o token contra a proposta publicada antes de persistir", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /parts\[1\] === "prospector"/);
  assert.match(route, /publication\.token_hash !== hashPublicProposalToken\(token\)/);
  assert.match(route, /email\.prospector\.draft/);
});
