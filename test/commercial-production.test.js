import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("proposta não injeta condição DEMO e herda termos do snapshot comercial", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /Pagamento mock local/);
  assert.match(route, /terms: String\(body\.terms \|\| commercialSnapshot\.specific_terms \|\| ""\)\.trim\(\)/);
});
