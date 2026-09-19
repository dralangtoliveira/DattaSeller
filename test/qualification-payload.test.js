import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQualification } from "../lib/prospector.js";

const base = {
  facts: ["Site público sem CTA no E2E"],
  hypotheses: ["Validar prioridade comercial"],
  recommendation: "datta360",
  reason: "Oportunidade observada em fonte pública",
  confidence: "medium",
  validation_question: "Aumentar pedidos é prioridade?",
  next_action: "revisar com operador",
  owner: "E2E",
};

test("a qualificação aceita o envelope lead_slug exigido pela rota", () => {
  const comEnvelope = normalizeQualification({ ...base, lead_slug: "e2e-20260919" });
  assert.equal(comEnvelope.error, undefined);
  assert.equal(comEnvelope.value.recommendation, "datta360");
  assert.ok(!("lead_slug" in comEnvelope.value), "o envelope não pode virar dado salvo");
});

test("a qualificação continua rejeitando campo fora do contrato", () => {
  const invalido = normalizeQualification({ ...base, campo_inventado: true });
  assert.equal(invalido.error, "qualification_field_not_allowed");
});

test("a qualificação continua exigindo os campos obrigatórios", () => {
  assert.equal(normalizeQualification({ ...base, facts: [] }).error, "qualification_incomplete_or_invalid");
  assert.equal(normalizeQualification({ ...base, confidence: "altíssima" }).error, "qualification_incomplete_or_invalid");
});
