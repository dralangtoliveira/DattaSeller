import test from "node:test";
import assert from "node:assert/strict";
import { resendConfigurationError } from "../lib/email/provider.ts";

test("Resend fails closed when the production key is absent", () => {
  assert.equal(resendConfigurationError("resend", false), "provider_not_configured");
  assert.equal(resendConfigurationError("resend", true), null);
  assert.equal(resendConfigurationError("mock", false), null);
});
