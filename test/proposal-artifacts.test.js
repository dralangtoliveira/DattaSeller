import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderProspectorProposalCover } from "../lib/prospector-proposal-cover.js";
import { publicProposalReadiness } from "../lib/public-proposal.js";

test("a publicação pública falha fechada até reunir todos os artefatos e termos", () => {
  const base = { token: "a".repeat(43), previewIds: ["preview_1"], diagnosisIds: ["diag_1"], socialIds: ["social_1"], price: 1500, currency: "BRL", terms: "Escopo aprovado", validUntil: "2026-09-30", oldUrl: "https://empresa.example/", previewFound: true, diagnosesFound: true, socialFound: true };
  assert.equal(publicProposalReadiness(base).ready, true);
  assert.deepEqual(publicProposalReadiness({ ...base, socialIds: [] }), { ready: false, missing: ["social"] });
  assert.deepEqual(publicProposalReadiness({ ...base, terms: "" }), { ready: false, missing: ["terms"] });
});

test("a capa de proposta apresenta diagnóstico factual e direção social persistidos", () => {
  const html = renderProspectorProposalCover({
    clientName: "Empresa Exemplo",
    previewUrl: "/api/previews/preview_1",
    oldUrl: "https://empresa.example/",
    author: "DattaSeller",
    diagnosisCriteria: [
      { label: "CTA", detail: "Contato visível, mas sem chamada comercial destacada." },
      "Navegação institucional observada.",
    ],
    socialAudits: [
      {
        platform: "instagram",
        username: "empresa",
        factual_notes: "Bio pública observada.",
        recommendation: "Organizar CTA e link.",
        creative_direction: "Hierarquia mais clara entre marca, prova e contato.",
      },
    ],
  });

  assert.match(html, /Diagnóstico factual/);
  assert.match(html, /Contato visível/);
  assert.match(html, /Direção social/);
  assert.match(html, /Organizar CTA e link/);
  assert.match(html, /Hierarquia mais clara/);
});

test("a proposta pública incorpora o preview e mostra o escopo comercial", () => {
  const html = renderProspectorProposalCover({ clientName: "Empresa Exemplo", previewDocument: "<h1>Preview real</h1>", productName: "Site", price: 1500, currency: "BRL", terms: "Escopo aprovado", validUntil: "30/09/2026" });
  assert.match(html, /srcdoc=/);
  assert.match(html, /Escopo comercial/);
  assert.match(html, /Escopo aprovado/);
});

test("a rota específica da capa vincula somente artefatos do mesmo lead", () => {
  const route = readFileSync(new URL("../app/api/proposals/[id]/cover/route.ts", import.meta.url), "utf8");
  assert.match(route, /proposal\.artifacts/);
  assert.match(route, /diagnosis_ids/);
  assert.match(route, /social_audit_ids/);
  assert.match(route, /\.eq\("lead_slug", proposal\.lead_slug\)/);
  assert.match(route, /X-Robots-Tag/);
  assert.match(route, /renderProspectorProposalCover/);
});

test("a rota pública exige token opaco e nunca depende de sessão do cliente", () => {
  const route = readFileSync(new URL("../app/p/[token]/route.ts", import.meta.url), "utf8");
  assert.match(route, /hashPublicProposalToken/);
  assert.match(route, /token_hash/);
  assert.match(route, /createSupabaseAdminClient/);
  assert.match(route, /previewDocument/);
  assert.match(route, /publicProposalReadiness/);
  assert.match(route, /notFound/);
  assert.match(route, /noindex, nofollow/);
});

test("o dashboard publica capability pelo servidor e não lê token em claro da proposta", () => {
  const patch = readFileSync(new URL("../scripts/production-dashboard-patch.mjs", import.meta.url), "utf8");
  assert.match(patch, /\/public/);
  assert.match(patch, /public_proposal/);
  assert.match(patch, /token_hash/);
  assert.doesNotMatch(patch, /artifacts\.public_token/);
});

test("a criação de proposta não persiste capability em claro", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  const proposalSection = route.slice(route.indexOf('if (root === "proposals")'), route.indexOf('if (root === "emails"'));
  assert.doesNotMatch(proposalSection, /public_token/);
  assert.match(proposalSection, /commercial_snapshot/);
});


test("publicação hash-only é recuperável sem persistir token em claro", () => {
  const route = readFileSync(new URL("../app/api/proposals/[id]/public/route.ts", import.meta.url), "utf8");
  assert.match(route, /activeHash/);
  assert.match(route, /ds_emails/);
  assert.match(route, /hashPublicProposalToken\(candidateToken\) === activeHash/);
  assert.match(route, /rotated_at/);
  assert.doesNotMatch(route, /public_token/);
});
