import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("o atualizador local lê token oculto e substitui somente sua variável", () => {
  const source = readFileSync(new URL("../scripts/set-local-supabase-token.ps1", import.meta.url), "utf8");
  assert.match(source, /Read-Host.*-AsSecureString/);
  assert.match(source, /\(\?m\)\^SUPABASE_ACCESS_TOKEN=\.\*\$/);
  assert.match(source, /ZeroFreeBSTR/);
  assert.doesNotMatch(source, /Write-Host.*\$token/);
});
