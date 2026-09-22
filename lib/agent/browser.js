/**
 * Ferramenta interna do DattaSeller Agent: `browser_public_page`.
 *
 * Abre a página PÚBLICA em browser real (Playwright já instalado no ambiente,
 * reaproveitado por caminho de módulo — nenhuma stack nova) e devolve o que foi
 * publicamente renderizado, com proveniência. Sem login de terceiro, sem cookie
 * de usuário, sem CAPTCHA bypass, sem proxy para contornar bloqueio.
 */

import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { assertSafeTarget, isSsrfCode, parseTargetUrl } from "../net/ssrf-guard.js";
import { AgentError } from "./contract.js";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_WAIT_MS = 3500;

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Carrega o Playwright já existente (módulo local) ou o do ambiente. */
export async function loadPlaywright({ modulePath = process.env.DATTASELLER_PLAYWRIGHT_MODULE ?? "" } = {}) {
  try {
    // Caminho de módulo pode ser o diretório do pacote (import de diretório não é
    // suportado em ESM): resolvemos para o entrypoint do pacote já instalado.
    const entrada = modulePath && existsSync(join(modulePath, "index.js")) ? join(modulePath, "index.js") : modulePath;
    const packageName = "playwright";
    const fallbackPackageName = "@playwright/test";
    const modulo = entrada
      ? await import(pathToFileURL(entrada).href)
      : await import(packageName).catch(() => import(fallbackPackageName));
    const chromium = (modulo.default ?? modulo).chromium;
    if (!chromium) throw new Error("chromium indisponível no módulo Playwright");
    return chromium;
  } catch (error) {
    throw new AgentError("agent_browser_unavailable", "Playwright não está disponível para o agente neste ambiente.", { causa: error?.message ?? String(error) });
  }
}

/**
 * Coleta estruturada da página pública. O retorno é sempre o mesmo contrato,
 * mesmo quando a página exige login: aí entram `warnings` e nada é inferido.
 */
export async function browserPublicPage({ url, purpose = "coleta publica", resolveHost, now = () => new Date(), timeoutMs = DEFAULT_TIMEOUT_MS, waitMs = DEFAULT_WAIT_MS, browserFactory = null } = {}) {
  // Guard SSRF antes de qualquer abertura de browser; erro do guard vira erro do
  // agente mantendo o código ssrf_*.
  try {
    parseTargetUrl(url);
    await assertSafeTarget(url, { resolveHost, label: "página pública" });
  } catch (error) {
    if (isSsrfCode(error?.code)) throw new AgentError(error.code, error.message, error.details ?? null);
    throw error;
  }
  const chromium = browserFactory ? await browserFactory() : await loadPlaywright();
  let browser = null;
  const warnings = [];
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
      locale: "pt-BR",
    });
    const page = await context.newPage();
    let status = null;
    try {
      const response = await page.goto(String(url), { waitUntil: "domcontentloaded", timeout: timeoutMs });
      status = response?.status() ?? null;
    } catch (error) {
      if (/Timeout/i.test(String(error?.message))) throw new AgentError("agent_browser_timeout", `A página pública não carregou em ${Math.round(timeoutMs / 1000)}s.`);
      if (isSsrfCode(error?.code)) throw error;
      throw new AgentError("agent_browser_unavailable", "Não foi possível abrir a página pública no browser do agente.", { causa: error?.message ?? String(error) });
    }
    await page.waitForTimeout(waitMs);
    // Redirect público → privado é recusado depois da navegação (nada é coletado).
    const urlFinal = page.url();
    try {
      parseTargetUrl(urlFinal);
      await assertSafeTarget(urlFinal, { resolveHost, label: "página pública (URL final)" });
    } catch (error) {
      if (isSsrfCode(error?.code)) throw new AgentError(error.code, `Redirect recusado: ${error.message}`, error.details ?? null);
      throw error;
    }
    const dados = await page.evaluate(() => {
      const metaDe = (nome) => document.querySelector(`meta[property="${nome}"], meta[name="${nome}"]`)?.getAttribute("content") ?? "";
      const absoluto = (valor) => { try { return new URL(valor, location.href).toString(); } catch { return ""; } };
      const ehPublico = (valor) => /^https?:\/\//i.test(valor);
      const links = [...new Set([...document.querySelectorAll("a[href]")].map((a) => absoluto(a.getAttribute("href"))).filter((href) => href && ehPublico(href)))].slice(0, 40);
      const imagens = [...new Set([...document.querySelectorAll("img[src]")].map((img) => absoluto(img.getAttribute("src"))).filter((src) => src && ehPublico(src)))].slice(0, 20);
      const abas = [...new Set([...document.querySelectorAll('[role="tab"], nav a, [role="navigation"] a')].map((el) => (el.textContent || "").trim()).filter((texto) => texto && texto.length <= 40))].slice(0, 12);
      return {
        title: document.title,
        meta: { og_title: metaDe("og:title"), og_description: metaDe("og:description"), og_image: metaDe("og:image"), description: metaDe("description") },
        visible_text: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, 4000),
        links,
        tabs: abas,
        images_public: imagens,
      };
    });
    const texto = dados.visible_text;
    if (/entrar|cadastre-se|log in|sign up|login/i.test(texto) && !dados.meta.og_description) {
      warnings.push({ code: "agent_browser_login_wall", message: "A página pública pediu login; somente o que estava visível foi coletado (nada foi contornado)." });
    }
    return {
      url: String(url),
      final_url: urlFinal,
      collected_at: now().toISOString(),
      purpose,
      status,
      title: clean(dados.title),
      meta: dados.meta,
      visible_text: texto,
      links: dados.links,
      tabs: dados.tabs,
      images_public: dados.images_public,
      collector: "playwright",
      warnings,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/** Adapta a coleta do browser ao formato de evidência aceito pelo contrato. */
export function browserEvidenceFrom(browserResult) {
  return {
    url: browserResult.final_url || browserResult.url,
    collected_at: browserResult.collected_at,
    title: browserResult.title,
    og_title: browserResult.meta?.og_title ?? "",
    og_description: browserResult.meta?.og_description ?? "",
    og_image: browserResult.meta?.og_image ?? "",
    visible_text: browserResult.visible_text,
    tabs: browserResult.tabs ?? [],
    collector: browserResult.collector ?? "playwright",
  };
}
