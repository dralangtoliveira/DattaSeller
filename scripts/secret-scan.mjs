#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

/**
 * Varredura de segredos do DattaSeller.
 *
 * Objetivo: impedir que credencial real chegue ao repositório ou ao deploy. O
 * scanner é conservador de propósito — só padrões de alta confiança entram na
 * lista, para não quebrar build por falso positivo. Ele nunca imprime o valor
 * encontrado: reporta apenas arquivo, linha e o nome do padrão.
 *
 * Uso:
 *   node scripts/secret-scan.mjs            # varre os arquivos versionados
 *   node scripts/secret-scan.mjs <dir>      # varre um diretório (usado em teste)
 *
 * Saída: lista de ocorrências e código 1 quando houver qualquer ocorrência.
 */

export const SECRET_PATTERNS = [
  { name: "openai-key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: "resend-key", pattern: /\bre_[A-Za-z0-9]{20,}\b/ },
  { name: "github-token", pattern: /\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/ },
  { name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "postgres-uri", pattern: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s:@/]{8,}@/ },
  { name: "supabase-service-role", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/ },
  { name: "resend-env", pattern: /RESEND_API_KEY\s*[:=]\s*["']?re_[A-Za-z0-9]{10,}/ },
];

// Tokens que aparecem no *valor encontrado* quando ele é claramente um exemplo.
// A checagem é feita no trecho casado, nunca na linha inteira: do contrário o
// nome da variável (por exemplo `RESEND_API_KEY=`) neutralizaria o próprio
// padrão que deveria detectar a credencial.
const PLACEHOLDER_TOKENS = ["test", "your", "xxx", "example", "placeholder", "replace_me", "<", "..."];

/** Um exemplo de URI de banco usa literalmente `user:password@`; uma senha real não. */
function isPlaceholderFinding(name, value) {
  if (PLACEHOLDER_TOKENS.some(token => value.includes(token))) return true;
  return name === "postgres-uri" && /(?:user|usuario|root|admin|senha|password)?:(?:password|senha)@/.test(value);
}

const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".gz", ".woff", ".woff2", ".ttf", ".pyc", ".xlsx", ".docx", ".mp4", ".svgz"]);
const SKIPPED_DIRECTORIES = ["node_modules", ".git", ".next", ".vercel", "coverage", "out", "dist"];

export function scanContent(relativePath, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const { name, pattern } of SECRET_PATTERNS) {
      const match = line.match(pattern);
      if (!match) continue;
      const value = match[0].toLowerCase();
      if (isPlaceholderFinding(name, value)) continue;
      findings.push({ file: relativePath, line: index + 1, pattern: name });
    }
  }
  return findings;
}

function trackedFiles(root) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
      .split("\n").filter(Boolean).map(path => join(root, path));
  } catch {
    return [];
  }
}

function directoryFiles(root) {
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.includes(entry.name) ? [] : walk(full);
    return [full];
  });
  return walk(root);
}

export function scanPaths(files, root) {
  const findings = [];
  for (const file of files) {
    if (SKIPPED_DIRECTORIES.some(directory => file.split(/[\\/]/).includes(directory))) continue;
    const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) continue;
    let stats;
    try { stats = statSync(file); } catch { continue; }
    if (!stats.isFile() || stats.size > 4 * 1024 * 1024) continue;
    const relative = file.startsWith(root) ? file.slice(root.length + 1) : file;
    findings.push(...scanContent(relative, readFileSync(file, "utf8")));
  }
  return findings;
}

function main() {
  const target = process.argv[2];
  const root = target ? resolve(process.cwd(), target) : process.cwd();
  // Em CI sem repositório Git completo a listagem por `git ls-files` volta vazia;
  // nesse caso varremos o diretório, para a barreira nunca virar um passe falso.
  const tracked = target ? [] : trackedFiles(root);
  const files = target ? directoryFiles(root) : tracked.length ? tracked : directoryFiles(root);
  const findings = scanPaths(files, root);
  if (findings.length) {
    console.error(`Varredura de segredos: ${findings.length} ocorrência(s). Nenhum valor foi impresso.`);
    for (const finding of findings) console.error(`- ${finding.file}:${finding.line} (${finding.pattern})`);
    process.exit(1);
  }
  console.log(`Varredura de segredos aprovada: ${files.length} arquivo(s) inspecionado(s), nenhuma credencial de alta confiança encontrada.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
