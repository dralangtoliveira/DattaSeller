import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { canGenerateContract, canSoftDeleteLead, escapeHtml, firstDisallowedKey, isAdminProfile, isSafeLeadSlug, LEAD_INPUT_KEYS, sellerName, SOCIAL_AUDIT_INPUT_KEYS } from "../lib/hardening/guards.ts";

test("soft delete is allowed without a paid order and blocked with a paid order", () => {
  assert.equal(canSoftDeleteLead(false), true);
  assert.equal(canSoftDeleteLead(true), false);
});

test("demo product cannot generate a contract", () => {
  assert.equal(canGenerateContract(true), false);
  assert.equal(canGenerateContract(false), true);
});

test("empty seller name blocks order creation", () => {
  assert.equal(sellerName("   "), null);
  assert.equal(sellerName("Ana"), "Ana");
});

test("lead and social-audit inputs reject fields outside their whitelists", () => {
  assert.equal(firstDisallowedKey({ nome: "Cliente", is_demo: true }, LEAD_INPUT_KEYS), "is_demo");
  assert.equal(firstDisallowedKey({ lead_slug: "cliente", platform: "instagram", role: "admin" }, SOCIAL_AUDIT_INPUT_KEYS), "role");
});

test("malicious lead slugs are rejected server-side", () => {
  assert.equal(isSafeLeadSlug("cliente-abc123"), true);
  assert.equal(isSafeLeadSlug("cliente');alert(1)//"), false);
  assert.equal(isSafeLeadSlug("https://evil.example"), false);
});

test("XSS lead names are escaped as text", () => {
  const rendered = escapeHtml("<img src=x onerror=alert(1)>");
  assert.equal(rendered, "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(rendered.includes("<img"), false);
  const dashboard = readFileSync(new URL("../poc/dattaseller-local/app/dashboard.html", import.meta.url), "utf8");
  assert.match(dashboard, /<div class="nm">'\+esc\(l\.nome\)\+f/);
  assert.match(dashboard, /function jsArg\(v\)/);
  assert.match(dashboard, /decodeURIComponent/);
});

test("login without an admin profile fails closed", () => {
  assert.equal(isAdminProfile(null), false);
  assert.equal(isAdminProfile({ role: "seller" }), false);
  assert.equal(isAdminProfile({ role: "admin" }), true);
});

test("phase A migration is structural only", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260915000000_phase_a_containment.sql", import.meta.url), "utf8");
  assert.match(migration, /deleted_at/);
  assert.match(migration, /unsubscribed_at/);
  assert.match(migration, /unsubscribe_token/);
  assert.match(migration, /ds_emails.*sent_at|sent_at.*ds_emails/s);
  assert.doesNotMatch(migration, /update\s+public\.ds_timeline/i);
  assert.doesNotMatch(migration, /AJUSTAR/i);
});

test("the production API wires the containment guards", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  const login = readFileSync(new URL("../app/login/actions.ts", import.meta.url), "utf8");
  assert.match(route, /is\("deleted_at", null\)/);
  assert.match(route, /deleted_at: now\(\)/);
  assert.match(route, /eq\("status", "paid"\)/);
  assert.match(route, /product\?\.is_demo === true/);
  assert.match(route, /seller = String\(cfg\.seller_name/);
  assert.doesNotMatch(route, /resetDemo/);
  assert.doesNotMatch(route, /Vendedor DEMO/);
  assert.match(login, /isAdminProfile\(profile\)/);
  assert.match(login, /auth\.signOut\(\)/);
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /from\("ds_users"\)/);
  assert.match(proxy, /if \(user\) await supabase\.auth\.signOut\(\)/);
});

test("the generated production dashboard inline scripts parse", () => {
  const dashboard = readFileSync(new URL("../public/dashboard.html", import.meta.url), "utf8");
  const scripts = [...dashboard.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  for (const [index, match] of scripts.entries()) {
    if (/application\/json/.test(match[0])) continue;
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `public/dashboard.html:inline-${index}` }));
  }
});

test("the production dashboard patch fails explicitly when a required target changes", () => {
  const patch = readFileSync(new URL("../scripts/production-dashboard-patch.mjs", import.meta.url), "utf8");
  assert.match(patch, /function replaceRequired\(/);
  assert.match(patch, /dashboard\.html sem alvo esperado/);
  assert.match(patch, /título da POC/);
  assert.match(patch, /aviso operacional da POC/);
});

test("the production patch keeps the DEMO reset control out of the published dashboard", () => {
  const patch = readFileSync(new URL("../scripts/production-dashboard-patch.mjs", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../public/dashboard.html", import.meta.url), "utf8");
  assert.match(patch, /function requireTarget\(/);
  assert.ok(patch.includes('requireTarget(html, "/api/demo/reset"'), "o build precisa falhar quando o alvo do reset DEMO desaparecer");
  assert.ok(patch.includes("/api\\/demo\\/reset"), "a remoção em runtime precisa ser ancorada no endpoint, não na ordem dos atributos");
  assert.ok(patch.includes("<button[^>]*>Resetar dados DEMO<\\/button>"), "a remoção por rótulo precisa permanecer como segunda barreira");
  assert.ok(dashboard.includes("/api/demo/reset"), "o artefato publicado precisa conter o alvo que o patch remove");
});
