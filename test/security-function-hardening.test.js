import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hardening = readFileSync(new URL("../supabase/migrations/20260922164000_security_function_hardening.sql", import.meta.url), "utf8");
const identity = readFileSync(new URL("../db/migrations/002_lead_identity.sql", import.meta.url), "utf8");

test("DS-SEC-03 preserva a função/event trigger e remove EXECUTE direto de papéis públicos", () => {
  assert.match(hardening, /to_regprocedure\('public\.rls_auto_enable\(\)'\)/);
  assert.match(hardening, /revoke execute on function public\.rls_auto_enable\(\) from public/i);
  assert.match(hardening, /from anon/i);
  assert.match(hardening, /from authenticated/i);
  assert.doesNotMatch(hardening, /drop\s+(event\s+trigger|function)/i);
});

test("DS-SEC-04 fixa search_path no banco existente e em instalações novas", () => {
  assert.match(hardening, /alter function public\.upsert_lead_identity\([^)]+\) set search_path to pg_catalog, public/i);
  assert.match(identity, /LANGUAGE plpgsql\s+SET search_path TO pg_catalog, public\s+AS \$\$/i);
});

test("migration de hardening não altera dados, tabelas ou policies", () => {
  assert.doesNotMatch(hardening, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(hardening, /alter table|create policy|drop policy/i);
});
