import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanContent } from "../scripts/secret-scan.mjs";

const repositoryRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const scanner = join(repositoryRoot, "scripts", "secret-scan.mjs");

test("detecta credencial de alta confiança sem imprimir o valor", () => {
  const fakeKey = "sk-" + "a".repeat(40);
  const findings = scanContent(".env", `OPENAI_API_KEY=${fakeKey}`);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].pattern, "openai-key");
  assert.equal(findings[0].line, 1);
  assert.ok(!JSON.stringify(findings).includes("a".repeat(40)), "o valor não pode aparecer no relatório");
});

test("detecta JWT, chave privada, URI de banco e chaves de fornecedor", () => {
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "s1gn4tureP4rtAbCdEf"].join(".");
  assert.equal(scanContent("a.ts", `const t = "${jwt}"`)[0].pattern, "jwt");
  assert.equal(scanContent("b.pem", "-----BEGIN PRIVATE KEY-----")[0].pattern, "private-key");
  assert.equal(scanContent("c.json", "DATABASE_URL=postgres://admin:senhaSuperSecreta123@db.example.com:5432/postgres")[0].pattern, "postgres-uri");
  const resendFindings = scanContent("d.env", "RESEND_API_KEY=re_" + "b".repeat(24)).map(finding => finding.pattern);
  assert.ok(resendFindings.includes("resend-key") || resendFindings.includes("resend-env"), `padrão de chave Resend não detectado: ${resendFindings}`);
});

test("não marca placeholders legítimos de documentação e exemplo", () => {
  for (const line of [
    "OPENAI_API_KEY=sk-your-key-here",
    "RESEND_API_KEY=re_test_000000000000000000",
    "SUPABASE_SERVICE_ROLE_KEY=",
    "DATABASE_URL=postgres://user:password@localhost:5432/db",
  ]) assert.deepEqual(scanContent("README.md", line), [], `placeholder marcado por engano: ${line}`);
});

test("reprova o diretório quando há segredo e aprova quando não há", () => {
  const directory = mkdtempSync(join(tmpdir(), "dattaseller-secret-scan-"));
  try {
    writeFileSync(join(directory, "config.js"), `module.exports = { token: "${"ghp_" + "c".repeat(36)}" };\n`);
    const failing = spawnSync(process.execPath, [scanner, directory], { encoding: "utf8" });
    assert.equal(failing.status, 1);
    assert.match(failing.stderr, /github-token/);
    assert.ok(!failing.stderr.includes("c".repeat(36)), "o valor não pode aparecer na saída");

    rmSync(join(directory, "config.js"));
    writeFileSync(join(directory, "clean.js"), "module.exports = { token: process.env.TOKEN };\n");
    const passing = spawnSync(process.execPath, [scanner, directory], { encoding: "utf8" });
    assert.equal(passing.status, 0);
    assert.match(passing.stdout, /Varredura de segredos aprovada/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("o repositório DattaSeller está limpo de credenciais de alta confiança", () => {
  const result = spawnSync(process.execPath, [scanner], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, `varredura reprovou:\n${result.stderr}`);
  assert.match(result.stdout, /nenhuma credencial de alta confiança encontrada/);
});
