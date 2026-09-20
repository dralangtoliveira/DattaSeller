/**
 * Gate 2 do fechamento do PR #20 — validação visual da INTERFACE SERVIDA.
 *
 * Navega com browser real (Playwright já instalado, reaproveitado por caminho de
 * módulo) pela aplicação servida, clica os 13 módulos canônicos, registra
 * título/conteúdo/erros de JS e salva as capturas.
 *
 * Uso: node scripts/crm-visual-validation.mjs <app_url> <cookie> [pasta_saida]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPlaywright } from "../lib/agent/browser.js";

const [appUrl, cookie, pastaSaida = ".redesign-e2e/crm-visual"] = process.argv.slice(2);
if (!appUrl || !cookie) {
  console.error("uso: node scripts/crm-visual-validation.mjs <app_url> <cookie> [pasta_saida]");
  process.exit(2);
}

const MODULOS = [
  ["geral", "Visão geral"], ["prospeccao", "Prospecção"], ["pipeline", "Pipeline"], ["clientes", "Clientes"],
  ["intelligence", "Inteligência"], ["workspace", "Central comercial"], ["timeline", "Timeline"], ["sites", "Sites / Preview"],
  ["comparador", "Comparador"], ["followup", "Follow-ups"], ["contratos", "Contratos"], ["financeiro", "Financeiro"], ["config", "Configurações"],
];

mkdirSync(pastaSaida, { recursive: true });
const chromium = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "pt-BR" });
await context.addCookies([{ name: "sb-127-auth-token", value: cookie.replace(/^sb-127-auth-token=/, ""), domain: "127.0.0.1", path: "/" }]);
// Permite validar somente o boot e a navegação do artefato servido sem tocar
// HML/Production. O modo é explícito e só pode ser ativado no ambiente local.
if (process.env.CRM_VISUAL_MOCK_API === "yes") {
  const collections = new Set(["leads", "products", "proposals", "emails", "orders", "checkouts", "payments", "contracts", "handoffs", "commissions", "timeline", "previews", "qualifications", "diagnoses", "social-audits"]);
  await context.route("**/api/**", async (route) => {
    const resource = new URL(route.request().url()).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const payload = collections.has(resource) ? [] : resource === "financial" || resource === "settings" || resource === "config" ? {} : {};
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
  });
}
const page = await context.newPage();
const erros = [];
page.on("pageerror", (erro) => erros.push(String(erro.message).slice(0, 200)));

const relatorio = { app: appUrl, url: null, titulo_pagina: null, modulos: [], erros_js: [], capturas: [] };
await page.goto(`${appUrl}/dashboard.html`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
relatorio.url = page.url();
relatorio.titulo_pagina = await page.title();
relatorio.login_page = relatorio.url.includes("/login");
relatorio.nav_botoes = await page.locator("nav button").count();
await page.screenshot({ path: join(pastaSaida, "crm-dashboard.png"), fullPage: true });
relatorio.capturas.push(join(pastaSaida, "crm-dashboard.png"));
console.error(`DIAGNOSTICO: url=${relatorio.url} titulo=${relatorio.titulo_pagina} nav=${relatorio.nav_botoes}`);
if (relatorio.login_page || relatorio.nav_botoes === 0) {
  relatorio.vista = await page.evaluate(() => ({ texto: (document.getElementById("view")?.innerText ?? "").slice(0, 300), modo: document.getElementById("modo")?.textContent ?? null, upd: document.getElementById("upd")?.textContent ?? null }));
  relatorio.console = [];
  writeFileSync(join(pastaSaida, "relatorio.json"), JSON.stringify(relatorio, null, 2), "utf8");
  await browser.close();
  console.error("GATE_2_VISUAL_13_MODULES: FAIL (a aplicação servida não abriu autenticada)");
  process.exit(1);
}

for (const [id, rotulo] of MODULOS) {
  const errosAntes = erros.length;
  let clique = "ok";
  try {
    await page.locator(`nav button[onclick="setView('${id}')"]`).first().click({ timeout: 5000 });
  } catch (error) {
    clique = `falha no clique: ${String(error.message).slice(0, 80)}`;
  }
  await page.waitForTimeout(700);
  const estado = await page.evaluate(() => ({
    titulo: document.getElementById("titulo")?.textContent?.trim() ?? null,
    conteudo: (document.getElementById("view")?.innerHTML ?? "").length,
    ativo: document.querySelector("nav button.on")?.textContent?.trim() ?? null,
    branco: (document.getElementById("view")?.innerHTML ?? "").trim().length === 0,
  }));
  const arquivo = join(pastaSaida, `crm-${id}.png`);
  await page.screenshot({ path: arquivo, fullPage: false });
  relatorio.capturas.push(arquivo);
  // Módulos sem dados (Timeline, Sites e Follow-ups, por exemplo) exibem um
  // estado vazio legítimo. O gate verifica que a view foi renderizada, não um
  // tamanho arbitrário de HTML que penalizaria justamente esses estados.
  const passou = clique === "ok" && !estado.branco && estado.conteudo > 0 && Boolean(estado.titulo) && erros.length === errosAntes;
  relatorio.modulos.push({ id, modulo: rotulo, clique, titulo: estado.titulo, conteudo_bytes: estado.conteudo, tela_branca: estado.branco, ativo: estado.ativo, erros_js: erros.length - errosAntes, resultado: passou ? "PASS" : "FAIL" });
}

// ida e volta: volta para Visão geral depois de percorrer todos
let idaVolta = { titulo: null, conteudo: 0 };
try {
  await page.locator(`nav button[onclick="setView('geral')"]`).first().click({ timeout: 5000 });
  await page.waitForTimeout(600);
  idaVolta = await page.evaluate(() => ({ titulo: document.getElementById("titulo")?.textContent?.trim() ?? null, conteudo: (document.getElementById("view")?.innerHTML ?? "").length }));
} catch (error) {
  idaVolta = { titulo: `falha na volta: ${String(error.message).slice(0, 60)}`, conteudo: 0 };
}
relatorio.ida_volta = idaVolta;
relatorio.erros_js = erros.slice(0, 8);
relatorio.resumo = { total: relatorio.modulos.length, pass: relatorio.modulos.filter((m) => m.resultado === "PASS").length };
await browser.close();

writeFileSync(join(pastaSaida, "relatorio.json"), JSON.stringify(relatorio, null, 2), "utf8");
console.log(JSON.stringify(relatorio, null, 1));
const ok = relatorio.resumo.pass === relatorio.modulos.length && relatorio.ida_volta.titulo === "Visão geral" && relatorio.erros_js.length === 0;
console.error(ok ? `GATE_2_VISUAL_13_MODULES: PASS (${relatorio.resumo.pass}/13)` : `GATE_2_VISUAL_13_MODULES: FAIL (${relatorio.resumo.pass}/13)`);
process.exitCode = ok ? 0 : 1;
