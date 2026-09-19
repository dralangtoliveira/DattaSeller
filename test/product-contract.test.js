import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(
  readFileSync(new URL("../product-contract/dattaseller-value-gates.json", import.meta.url), "utf8")
);

const required = Array.from({ length: 11 }, (_, index) => `DS-VALUE-${String(index + 1).padStart(2, "0")}`);

test("contrato funcional DattaSeller mantém todos os gates de valor", () => {
  assert.deepEqual(contract.gates.map((gate) => gate.id), required);
  assert.equal(new Set(contract.gates.map((gate) => gate.id)).size, required.length);
});

test("cada gate possui status válido e evidência explícita", () => {
  const allowed = new Set(contract.allowed_status);
  for (const gate of contract.gates) {
    assert.ok(allowed.has(gate.status), `${gate.id}: status inválido`);
    assert.ok(Array.isArray(gate.evidence) && gate.evidence.length > 0, `${gate.id}: evidência ausente`);
    assert.ok(gate.evidence.every((item) => typeof item === "string" && item.trim()), `${gate.id}: evidência vazia`);
  }
});

test("PRODUCT_READY só pode ser true com todos os gates PROVEN_REAL", () => {
  const allReal = contract.gates.every((gate) => gate.status === "PROVEN_REAL");
  assert.equal(contract.product_ready, allReal,
    "product_ready deve refletir exatamente a prova real de todos os gates");
});
