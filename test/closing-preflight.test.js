import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const script = join(root, "scripts", "closing-preflight.mjs");
test("preflight nomeia cada dependência de fechamento sem imprimir segredo", () => {
  const output = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH } });
  assert.equal(output.status, 1);
  for (const field of ["HML_ADMIN_ACCESS", "HML_DATABASE", "HML_MIGRATION_PENDING", "PREVIEW_HML_BINDING", "E2E_ADMIN", "CONTROLLED_MAILBOX", "CONTROLLED_SENDER", "RESEND_WEBHOOK_SECRET", "RESEND_WEBHOOK_ROUTE", "PUBLIC_PROPOSAL_URL", "E2E_RUNNER", "READY_FOR_DS07_11"]) assert.match(output.stdout, new RegExp(`${field}:`));
  assert.match(output.stdout, /SUPABASE_ACCESS_TOKEN/);
});

test("preflight publicado exige verificação administrativa HML", () => {
  const packageJson = readFileSync(join(root, "package.json"), "utf8");
  assert.match(packageJson, /closing:preflight.*--verify-hml/);
});
