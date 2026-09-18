import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScope } from "../scripts/hml-bootstrap.mjs";

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

// Julgamento puro do escopo (etapa 1 do runbook) — coberto offline, sem rede.
test("sem organização visível o token é tratado como project-scoped e a criação é proibida", () => {
  const verdict = evaluateScope({ orgsOk: true, orgsVisible: 0, projectsOk: true, hmlExists: false });
  assert.equal(verdict.scope, "project-scoped");
  assert.equal(verdict.canCreateProject, false);
  assert.equal(verdict.reason, "token_cannot_create_project");
});

test("com organização visível a criação é permitida e o HML existente é reutilizado", () => {
  const criar = evaluateScope({ orgsOk: true, orgsVisible: 1, projectsOk: true, hmlExists: false });
  assert.equal(criar.scope, "organization-wide");
  assert.equal(criar.canCreateProject, true);
  assert.equal(criar.reason, "create_allowed");
  const reusar = evaluateScope({ orgsOk: true, orgsVisible: 1, projectsOk: true, hmlExists: true });
  assert.equal(reusar.reason, "reuse_existing_hml");
});

test("erro de API nunca vira permissão: escopo unknown bloqueia a criação", () => {
  for (const input of [
    { orgsOk: false, orgsVisible: 0, projectsOk: true, hmlExists: false },
    { orgsOk: true, orgsVisible: 3, projectsOk: false, hmlExists: false },
  ]) {
    const verdict = evaluateScope(input);
    assert.equal(verdict.scope, "unknown");
    assert.equal(verdict.canCreateProject, false);
    assert.equal(verdict.reason, "api_unavailable");
  }
});

test("apply consulta o escopo antes de criar e recusa quando não pode criar", () => {
  const applySection = source.slice(source.indexOf("async function apply()"), source.indexOf("const isEntrypoint"));
  assert.match(applySection, /const \{ existing, canCreateProject, reason \} = await check\(\)/);
  assert.match(applySection, /if \(!existing && !canCreateProject\) \{ console\.error\(`apply recusado: credencial sem permissão de criação \(\$\{reason\}\)`\); process\.exit\(4\); \}/);
  // A criação só pode existir depois da checagem de escopo.
  assert.ok(applySection.indexOf("canCreateProject") < applySection.indexOf('api("/projects", { method: "POST"'));
});

test("importar o script não executa CLI nem chama a rede", () => {
  assert.match(source, /const isEntrypoint = process\.argv\[1\] && import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/);
  assert.match(source, /if \(isEntrypoint\) \{/);
});
