import test from "node:test";
import assert from "node:assert/strict";
import { createPublicProposalToken, hashPublicProposalToken, isPublicProposalToken, sanitizePublicPreviewHtml } from "../lib/public-proposal.js";

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
