import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// O bootstrap HML mexe em credencial e em banco. Estes testes travam as
// salvaguardas: nada de mutação sem flag explícita, nada de agir sem token, e
// nenhuma linha que possa imprimir o token.
const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const script = join(root, "scripts", "hml-bootstrap.mjs");
const source = readFileSync(script, "utf8");

function run(args, { cwd = root, env = {} } = {}) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", ...env } });
}

test("apply sem HML_APPLY=yes é recusado antes de qualquer chamada", () => {
  const result = run(["apply"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /HML_APPLY=yes/);
});

test("sem token o script falha fechado com código 3", () => {
  const directory = mkdtempSync(join(tmpdir(), "hml-bootstrap-"));
  try {
    const result = run(["check"], { cwd: directory });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /token ausente/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("o script nunca imprime, loga ou commita o token", () => {
  const printLines = source.split(/\r?\n/).filter(line => /console\.(log|error|warn)\(/.test(line));
  for (const line of printLines) {
    // A palavra "token" pode aparecer em mensagens de falha fechado; o que não
    // pode existir é interpolação do valor em qualquer saída.
    assert.ok(!/\$\{\s*token\s*\(/.test(line), `linha de saída interpola o token: ${line.trim()}`);
    assert.ok(!/Bearer \$\{/.test(line), `linha de saída interpola credencial: ${line.trim()}`);
  }
  assert.match(source, /SUPABASE_ACCESS_TOKEN/);
  assert.match(source, /Authorization: `Bearer \$\{token\(\)\}`/);
});

test("o ref de Production é citado apenas como aviso, nunca como alvo de escrita", () => {
  assert.match(source, /const PRODUCTION_REF = "vkvkzoulbljampcbxaim"/);
  assert.match(source, /aviso: Production=/);
  // Nenhuma chamada de mutação pode apontar para o ref de Production.
  const writeCalls = source.match(/api\(`\/projects\/\$\{[^}]+\}\/database\/query`/g) ?? [];
  for (const call of writeCalls) assert.ok(!call.includes("PRODUCTION_REF"), "migration não pode mirar Production");
  assert.match(source, /HML_NAME/);
});

test("as migrations canônicas estão declaradas na ordem correta", () => {
  const order = ["db/migrations/001_commercial_core.sql", "db/migrations/002_lead_identity.sql", "db/migrations/003_recommendation_feedback.sql", "supabase/migrations/20260914031102_dattaseller_web_schema.sql"];
  const declared = source.match(/const MIGRATIONS = \[([^\]]+)\]/)[1];
  let cursor = -1;
  for (const file of order) {
    const position = declared.indexOf(file);
    assert.ok(position > cursor, `${file} fora de ordem`);
    cursor = position;
  }
});

test("a criação só acontece com plano free e senha aleatória local", () => {
  assert.match(source, /plan: "free"/);
  assert.match(source, /randomBytes\(24\)/);
  assert.match(source, /SUPABASE_HML_DB_PASSWORD=/);
  assert.ok(!/console\.(log|error)\(.*password/i.test(source), "senha não pode ser impressa");
});
