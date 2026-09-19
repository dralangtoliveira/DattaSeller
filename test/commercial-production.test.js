import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("proposta não injeta condição de pagamento DEMO e herda termos do produto", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /Pagamento mock local/);
  assert.match(route, /terms: String\(body\.terms \|\| product\.terms \|\| ""\)\.trim\(\)/);
});
