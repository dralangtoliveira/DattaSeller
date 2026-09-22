import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RUNTIME_ROOTS = ["app", "lib", "src"];
const EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const LEGACY_TABLES = [
  "users",
  "companies",
  "leads",
  "lead_sources",
  "products",
  "product_plans",
  "opportunities",
  "recommendations",
  "activities",
  "orders",
  "payments",
  "sales",
  "commissions",
  "delivery_orders",
  "integration_attempts",
  "audit_events",
  "recommendation_feedback",
];

function filesUnder(path) {
  const out = [];
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    const info = statSync(full);
    if (info.isDirectory()) out.push(...filesUnder(full));
    else if (EXTENSIONS.has(extname(full))) out.push(full);
  }
  return out;
}

test("runtime não volta a acessar o schema comercial legado diretamente", () => {
  const files = RUNTIME_ROOTS.flatMap((name) => filesUnder(join(ROOT, name)));
  files.push(join(ROOT, "proxy.ts"));
  const tableAlternation = LEGACY_TABLES.join("|");
  const supabaseFrom = new RegExp(`\\.from\\(\\s*["'](?:${tableAlternation})["']\\s*\\)`, "g");
  const restPath = new RegExp(`/rest/v1/(?:${tableAlternation})(?:[/?#"\\s]|$)`, "g");
  const legacyRpc = /\.rpc\(\s*["']upsert_lead_identity["']\s*[,)]/g;
  const violations = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const [kind, pattern] of [["supabase.from", supabaseFrom], ["rest/v1", restPath], ["rpc", legacyRpc]]) {
      pattern.lastIndex = 0;
      const matches = [...source.matchAll(pattern)];
      for (const match of matches) violations.push({ file: relative(ROOT, file), kind, match: match[0] });
    }
  }

  assert.deepEqual(violations, []);
});
