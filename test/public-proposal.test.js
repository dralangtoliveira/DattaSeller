import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicProposalToken, hashPublicProposalToken, isPublicProposalToken, sanitizePublicPreviewHtml } from "../lib/public-proposal.js";

test("a borda deixa o capability público passar sem sessão (DS-VALUE-07)", () => {
  // Defeito real encontrado no HML: `/p/:token` respondia 307 para /login e o
  // cliente sem login nunca abria a proposta completa.
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /path\.startsWith\("\/p\/"\)/, "a borda precisa liberar o caminho público da proposta");
  assert.match(proxy, /path === "\/p"/, "a raiz pública também precisa ser liberada");
  assert.match(proxy, /if \(!isAdmin && !isPublic\)/, "todo caminho não público continua exigindo admin");
});

test("capability pública usa 32 bytes e persiste somente hash", () => {
  const token = createPublicProposalToken();
  assert.equal(isPublicProposalToken(token), true);
  assert.equal(token.length, 43);
  const hash = hashPublicProposalToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
});

test("sanitização pública remove scripts, handlers e recursos remotos do preview", () => {
  const html = sanitizePublicPreviewHtml('<script>alert(1)</script><img src="https://evil.example/a.png" onerror="x()"><form action="https://evil.example"><button>ok</button></form>');
  assert.doesNotMatch(html, /script|onerror|https:\/\/evil\.example|<form/i);
});
