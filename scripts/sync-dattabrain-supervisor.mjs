import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";

const repoRoot = resolve(process.cwd());
const defaultBrain = join(os.homedir(), "OneDrive", "Documentos", "ChatGPT", "DattaBrain");
const brainRoot = process.env.DATTABRAIN_ROOT ? resolve(process.env.DATTABRAIN_ROOT) : defaultBrain;
const projectDir = join(brainRoot, "DattaSeller");

if (!existsSync(brainRoot)) {
  console.error(`BRAIN_SYNC_MISSING: DattaBrain não encontrado em ${brainRoot}`);
  process.exit(2);
}

mkdirSync(projectDir, { recursive: true });

const supervisorSource = join(repoRoot, "docs", "DATTABRAIN-SUPERVISOR-DATTASELLER.md");
const gatesSource = join(repoRoot, "product-contract", "dattaseller-value-gates.json");
const supervisor = readFileSync(supervisorSource, "utf8");
const contract = JSON.parse(readFileSync(gatesSource, "utf8"));

let commit = "unknown";
let branch = "unknown";
try {
  commit = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  branch = execSync("git branch --show-current", { cwd: repoRoot, encoding: "utf8" }).trim();
} catch {}

const provenance = [
  "<!-- AUTO-SYNCED: edit the Git source, not this file -->",
  "",
  `> Sincronizado do Git DattaSeller. Branch: \`${branch}\` · Commit: \`${commit}\`.`,
  "> Fonte: `docs/DATTABRAIN-SUPERVISOR-DATTASELLER.md`.",
  "",
].join("\n");

writeFileSync(join(projectDir, "SUPERVISOR-CANONICAL.md"), provenance + supervisor.trim() + "\n", "utf8");

const rows = contract.gates.map((gate) =>
  `| ${gate.id} | ${gate.name} | ${gate.status} | ${(gate.evidence || []).join(" / ").replaceAll("|", "\\|")} |`
).join("\n");

const gatesMd = [
  "<!-- AUTO-SYNCED: edit product-contract/dattaseller-value-gates.json, not this file -->",
  "",
  "# DattaSeller — Gates de Valor",
  "",
  `> Branch: \`${branch}\` · Commit: \`${commit}\``,
  `> PRODUCT_READY: **${contract.product_ready ? "TRUE" : "FALSE"}**`,
  "",
  "| Gate | Entrega | Estado | Evidência atual |",
  "| --- | --- | --- | --- |",
  rows,
  "",
  "## Regra",
  "",
  "Um gate só muda para `PROVEN_REAL` com evidência funcional reproduzível. Rota, tabela, formulário, mock, CI ou deploy isolados não encerram gate.",
  "",
].join("\n");

writeFileSync(join(projectDir, "VALUE-GATES.md"), gatesMd, "utf8");

console.log(`DATTABRAIN_SYNC_OK: ${projectDir}`);
console.log("Arquivos sincronizados: SUPERVISOR-CANONICAL.md, VALUE-GATES.md");
console.log("STATE.md/NEXT.md/BLOCKERS.md/DECISIONS.md/ACCEPTANCE.md não foram sobrescritos.");
