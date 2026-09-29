import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types loader resolves the source extension at runtime.
import { handleResendReply } from "../lib/integrations/resend-reply-webhook.ts";

function store({ parent = { id: "mail-1", lead_slug: "lead-a", recipient: "buyer@example.com" }, duplicate = null }: any = {}) {
  const calls: string[] = [];
  const db = () => ({ from(table: string) {
    calls.push(`from:${table}`);
    if (table === "ds_emails") return {
      select: () => ({ eq: (_: string, value: string) => ({ maybeSingle: async () => ({ data: value === "provider-parent" ? parent : duplicate, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    };
    return { insert: async () => ({ error: null }) };
  } });
  return { db, calls };
}

const headers = new Headers({ "svix-id": "id", "svix-timestamp": "1", "svix-signature": "sig" });
const received = { type: "email.received", data: { email_id: "inbound-1" } };
const message = { in_reply_to: "provider-parent", from: "buyer@example.com", subject: "Re: proposta", text: "Tenho interesse." };
const receive = async () => message;

test("resposta comercial recusa assinatura inválida e segredo ausente antes do banco", async () => {
  const s = store();
  const missing = await handleResendReply({ raw: "{}", headers, secret: "", verify: () => received, receive, db: s.db });
  assert.equal(missing.status, 503); assert.deepEqual(s.calls, []);
  const invalid = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => { throw new Error("bad"); }, receive, db: s.db });
  assert.equal(invalid.status, 400); assert.deepEqual(s.calls, []);
});

test("resposta sem envio pai é reconhecida sem mutar CRM", async () => {
  const s = store({ parent: null });
  const result = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => received, receive, db: s.db });
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { ok: true, ignored: true, reason: "unmatched_reply" });
  assert.deepEqual(s.calls, ["from:ds_emails"]);
});

test("resposta assinada é idempotente, vinculada ao envio e registrada na timeline", async () => {
  const s = store();
  const result = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => received, receive, db: s.db });
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { ok: true, email_id: "mail-1" });
  assert.deepEqual(s.calls, ["from:ds_emails", "from:ds_emails", "from:ds_emails", "from:ds_inbound_events", "from:ds_timeline"]);
  const replay = store({ duplicate: { id: "mail-1" } });
  const replayResult = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => received, receive, db: replay.db });
  assert.deepEqual(await replayResult.json(), { ok: true, duplicate: true });
});

test("resposta assinada de remetente divergente não alcança lead nem timeline", async () => {
  const s = store();
  const result = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => received, receive: async () => ({ ...message, from: "other@example.com" }), db: s.db });
  assert.deepEqual(await result.json(), { ok: true, ignored: true, reason: "sender_mismatch" });
  assert.deepEqual(s.calls, ["from:ds_emails"]);
});

test("falha ao obter mensagem autenticada não muta CRM", async () => {
  const s = store();
  const result = await handleResendReply({ raw: "{}", headers, secret: "whsec", verify: () => received, receive: async () => { throw new Error("provider down"); }, db: s.db });
  assert.equal(result.status, 503); assert.deepEqual(s.calls, []);
});
