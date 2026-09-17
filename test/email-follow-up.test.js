import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFollowUpDraft, canScheduleFollowUp, followUpDueAt, FOLLOW_UP_DEFAULT_DAYS } from "../lib/email/follow-up.js";

test("o follow-up só é agendado depois de um envio com desfecho conhecido", () => {
  for (const status of ["sent", "delivered_simulated", "no_reply", "generic_reply"]) assert.equal(canScheduleFollowUp(status), true, `${status} deveria permitir follow-up`);
  for (const status of ["draft", "reviewed", "approved", "bounce", "failed", "", "  ", null, undefined]) assert.equal(canScheduleFollowUp(status), false, `${status} não deveria permitir follow-up`);
});

test("o rascunho de follow-up reutiliza o assunto, o histórico e a assinatura do operador", () => {
  const draft = buildFollowUpDraft({ subject: "Proposta Datta360", updated_at: "2026-09-10T12:00:00.000Z" }, { sellerName: "Ana", days: 4, referenceDate: new Date("2026-09-12T00:00:00.000Z") });
  assert.equal(draft.subject, "Re: Proposta Datta360");
  assert.match(draft.body, /"Proposta Datta360"/);
  assert.match(draft.body, /enviado em 2026-09-10/);
  assert.match(draft.body, /Atenciosamente,\nAna$/);
  assert.equal(draft.due_at, "2026-09-16T00:00:00.000Z");
  assert.equal(buildFollowUpDraft({ subject: "Re: já prefixado", created_at: "2026-09-01T00:00:00.000Z" }, { referenceDate: new Date("2026-09-01T00:00:00.000Z") }).subject, "Re: já prefixado");
  assert.equal(buildFollowUpDraft({}).subject, "Re: Proposta DattaSeller");
  assert.match(buildFollowUpDraft({}).body, /DattaSeller$/);
  assert.doesNotMatch(buildFollowUpDraft({}, { referenceDate: new Date("2026-09-01T00:00:00.000Z") }).body, /enviado em/);
});

test("o prazo do follow-up é configurável e tem padrão explícito", () => {
  const reference = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(followUpDueAt(7, reference), "2026-01-08T00:00:00.000Z");
  assert.equal(FOLLOW_UP_DEFAULT_DAYS, 3);
  assert.equal(followUpDueAt(undefined, reference), "2026-01-04T00:00:00.000Z");
  assert.equal(followUpDueAt(0, reference), "2026-01-04T00:00:00.000Z");
  assert.equal(followUpDueAt("inválido", reference), "2026-01-04T00:00:00.000Z");
});

test("a Central de e-mail agenda o follow-up ligado ao envio original", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /parts\[2\] === "follow-up"/);
  assert.match(route, /canScheduleFollowUp\(/);
  assert.match(route, /buildFollowUpDraft\(/);
  assert.match(route, /db\.from\("ds_followups"\)/);
  assert.match(route, /follow_up_requires_sent_email/);
  assert.match(route, /email\.follow_up\.scheduled/);
  assert.ok(route.indexOf('parts[2] === "follow-up"') < route.indexOf('if (root === "emails") { const row'), "o follow-up precisa ser resolvido antes de criar um rascunho genérico");
});

test("um envio que falhou volta a ser rascunho editável antes de nova aprovação", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /\["draft","reviewed","failed"\]\.includes\(current\.status\)/);
  assert.match(route, /if \(current\.status === "failed"\) \{ patch\.status = "draft"; patch\.error = null; \}/);
  const dashboard = readFileSync(new URL("../scripts/sync-dashboard.mjs", import.meta.url), "utf8");
  assert.match(dashboard, /\/follow-up/);
  assert.match(dashboard, /dsScheduleFollowUp/);
});
