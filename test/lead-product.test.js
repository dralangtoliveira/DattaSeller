import assert from "node:assert/strict";
import test from "node:test";
import { recommendProducts, overrideRecommendation, recordRecommendationFeedback, RULE_VERSION } from "../src/match/lead-product.js";

test("returns an explained DattaVPS recommendation", () => {
  const recommendation = recommendProducts({ pains: "Preciso de um servidor 24h para Docker e aplicação self-hosted" });
  assert.equal(recommendation.ruleVersion, RULE_VERSION);
  assert.equal(recommendation.result, "dattavps");
  assert.deepEqual(recommendation.candidates[0].reasons, ["servidor 24h", "docker", "self-hosted"]);
});

test("returns both products when VPS and security signals exist", () => {
  const recommendation = recommendProducts({ notes: "Automação n8n usa credencial sensível num VPS" });
  assert.equal(recommendation.result, "both");
  assert.deepEqual(recommendation.candidates.map(({ product }) => product), ["dattaseg", "dattavps"]);
});

test("returns none without an explicit signal", () => {
  assert.deepEqual(recommendProducts({ segment: "restaurante local" }), { ruleVersion: RULE_VERSION, result: "none", candidates: [] });
});

test("requires an accountable manual override and records seller feedback", () => {
  const initial = recommendProducts({ pains: "VPS" });
  assert.throws(() => overrideRecommendation(initial, "none", "", "seller-1"), /reason/);
  const overridden = overrideRecommendation(initial, "dattaseg", "Cliente informou uso de n8n", "seller-1");
  assert.equal(overridden.overrideReason, "Cliente informou uso de n8n");
  assert.deepEqual(recordRecommendationFeedback("rec-1", true, "seller-1"), { recommendationId: "rec-1", useful: true, actorId: "seller-1" });
});
