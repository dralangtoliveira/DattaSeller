import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { renderProspectorProposalCover } from "../lib/prospector-proposal-cover.js";

const output = ".public-proposal-e2e";
const html = renderProspectorProposalCover({
  clientName: "Empresa de validação",
  oldUrl: "https://cliente.example/",
  previewHtml: "<!doctype html><h1>Nova versão demonstrativa</h1><p>Conteúdo isolado e sem recursos remotos.</p>",
  diagnosisCriteria: [{ label: "CTA", detail: "Contato público observado." }],
  socialAudits: [{ platform: "instagram", username: "empresa", factual_notes: "Bio pública observada.", recommendation: "Organizar CTA.", creative_direction: "Hierarquia clara." }],
  publicMode: true,
});
const server = createServer((request, response) => {
  if (request.url === "/p/valid-token") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
    response.end(html);
    return;
  }
  response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Frame-Options": "DENY" });
  response.end("Not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const valid = await page.goto(`${base}/p/valid-token`, { waitUntil: "networkidle" });
  const screenshot = `${output}/public-proposal.png`;
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const content = await page.content();
  const invalid = await page.goto(`${base}/p/invalid-token`, { waitUntil: "networkidle" });
  const report = { gate: "DS-VALUE-07", served: true, valid_status: valid?.status(), invalid_status: invalid?.status(), pageerrors: pageErrors, required_sections: ["Antes", "Depois", "Diagnóstico factual", "Direção social"].filter((section) => content.includes(section)), headers: { noindex: valid?.headers()["x-robots-tag"], frame: valid?.headers()["x-frame-options"] } };
  await writeFile(`${output}/relatorio.json`, `${JSON.stringify(report, null, 2)}\n`);
  if (report.valid_status !== 200 || report.invalid_status !== 404 || pageErrors.length || report.required_sections.length !== 4 || report.headers.noindex !== "noindex, nofollow, noarchive" || report.headers.frame !== "DENY") throw new Error("public_proposal_visual_gate_failed");
  process.stdout.write(`${JSON.stringify(report)}\n`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
