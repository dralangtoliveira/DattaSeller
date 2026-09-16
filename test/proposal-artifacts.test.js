import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderProspectorProposalCover } from "../lib/prospector-proposal-cover.js";

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

test("a rota específica da capa vincula somente artefatos do mesmo lead", () => {
  const route = readFileSync(new URL("../app/api/proposals/[id]/cover/route.ts", import.meta.url), "utf8");
  assert.match(route, /proposal\.artifacts/);
  assert.match(route, /diagnosis_ids/);
  assert.match(route, /social_audit_ids/);
  assert.match(route, /\.eq\("lead_slug", proposal\.lead_slug\)/);
  assert.match(route, /X-Robots-Tag/);
  assert.match(route, /renderProspectorProposalCover/);
});
