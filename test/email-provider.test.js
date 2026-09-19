import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resendConfigurationError } from "../lib/email/provider.ts";
import { resolveEmailRecipient } from "../lib/email/provider.ts";

test("Resend fails closed when the production key is absent", () => {
  assert.equal(resendConfigurationError("resend", false), "provider_not_configured");
  assert.equal(resendConfigurationError("resend", true), null);
  assert.equal(resendConfigurationError("mock", false), null);
});

test("o envio real resolve o destinatario pelo rascunho ou pelo lead", () => {
  assert.equal(resolveEmailRecipient({ recipient: "controle@example.com" }, { email: "lead@example.com" }), "controle@example.com");
  assert.equal(resolveEmailRecipient({ recipient: null }, { email: "lead@example.com" }), "lead@example.com");
  assert.equal(resolveEmailRecipient({ recipient: "   " }, { email: " lead@example.com " }), "lead@example.com");
  assert.equal(resolveEmailRecipient({ recipient: null }, { email: null }), null);
  assert.equal(resolveEmailRecipient(null, null), null);
});

test("a transicao de envio hidrata o destinatario antes de chamar o provedor", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /async function hydrateEmailRecipient\(/, "o fluxo precisa resolver o destinatario que o rascunho nao guarda");
  assert.match(route, /body\.status === "sent_simulated"\) await hydrateEmailRecipient\(db, parts\[1\]\)/, "a hidratacao precisa acontecer antes da transicao de envio");
  assert.match(route, /resolveEmailRecipient\(email, lead\)/);
});
