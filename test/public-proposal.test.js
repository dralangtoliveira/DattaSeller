import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicProposalToken, hashPublicProposalToken, isPublicProposalToken, sanitizePublicPreviewHtml } from "../lib/public-proposal.js";
import { renderProspectorProposalCover } from "../lib/prospector-proposal-cover.js";

test("token público usa 32 bytes, é validável e só o hash é persistível", () => {
  const token = createPublicProposalToken();
  assert.equal(token.length, 43);
  assert.equal(isPublicProposalToken(token), true);
  assert.match(hashPublicProposalToken(token), /^[a-f0-9]{64}$/);
  assert.equal(hashPublicProposalToken("invalido"), "");
});

test("sanitização pública elimina execução, navegação e recursos externos", () => {
  const html = sanitizePublicPreviewHtml('<script>alert(1)</script><iframe src="https://evil.example"></iframe><img src="https://evil.example/a" onerror="alert(2)"><a href="javascript:alert(3)">x</a><style>@import url(https://evil.example);.x{background:url(https://evil.example)}</style>');
  assert.doesNotMatch(html, /script|iframe|onerror|https:\/\/evil|javascript:/i);
});

test("capa pública não incorpora site externo, não expõe contato e isola o preview", () => {
  const html = renderProspectorProposalCover({ clientName: "Empresa", oldUrl: "https://cliente.example/", previewHtml: '<h1>Preview</h1><script>alert(1)</script>', diagnosisCriteria: ["CTA observado"], socialAudits: [{ platform: "instagram", username: "empresa", factual_notes: "Bio pública" }], publicMode: true, whatsapp: "5511999999999" });
  assert.match(html, /Condições comerciais dependem de validação/);
  assert.match(html, /sandbox=""/);
  assert.match(html, /Diagnóstico factual/);
  assert.match(html, /Direção social/);
  assert.doesNotMatch(html, /wa\.me|WhatsApp|https:\/\/cliente\.example/i);
});

test("rotas pública e administrativa exigem hash, administrador e vínculo do mesmo lead", () => {
  const publicRoute = readFileSync(new URL("../app/p/[token]/route.ts", import.meta.url), "utf8");
  const adminRoute = readFileSync(new URL("../app/api/proposals/[id]/public/route.ts", import.meta.url), "utf8");
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(publicRoute, /createSupabaseAdminClient/);
  assert.match(publicRoute, /token_hash/);
  assert.match(publicRoute, /revoked_at/);
  assert.match(publicRoute, /\.eq\("lead_slug", proposal\.lead_slug\)/);
  assert.match(publicRoute, /X-Frame-Options/);
  assert.match(publicRoute, /Content-Security-Policy/);
  assert.match(adminRoute, /createPublicProposalToken/);
  assert.match(adminRoute, /hashPublicProposalToken/);
  assert.match(adminRoute, /proposal_artifacts_cross_lead/);
  assert.match(adminRoute, /adminContext/);
  assert.match(proxy, /path\.startsWith\("\/p\/"\)/);
});
