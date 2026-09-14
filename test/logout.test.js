import test from "node:test";
import assert from "node:assert/strict";
import { signOutSafely } from "../lib/auth/logout.ts";

test("logout calls Supabase Auth and succeeds", async () => {
  let calls = 0;
  const result = await signOutSafely({
    auth: {
      async signOut() {
        calls += 1;
        return { error: null };
      },
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 1);
});

test("logout remains generic when Supabase reports an expired or absent session", async () => {
  const result = await signOutSafely({
    auth: {
      async signOut() {
        return { error: new Error("refresh token is invalid") };
      },
    },
  });

  assert.deepEqual(result, { ok: false, error: "logout_failed" });
  assert.equal(JSON.stringify(result).includes("refresh token"), false);
});

test("logout does not expose network or provider errors", async () => {
  const result = await signOutSafely({
    auth: {
      async signOut() {
        throw new Error("SUPABASE_SECRET_KEY leaked by a provider error");
      },
    },
  });

  assert.deepEqual(result, { ok: false, error: "logout_failed" });
  assert.equal(JSON.stringify(result).includes("SUPABASE_SECRET_KEY"), false);
});
