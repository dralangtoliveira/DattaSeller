const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const url = process.env.DATTASELLER_URL || 'http://127.0.0.1:8765';
const widths = [360, 375, 768, 1024, 1280, 1440];
const expectedViews = [
  'Visão geral', 'Pipeline', 'Clientes', 'Sites', 'Comparador',
  'Follow-ups', 'Contratos', 'Financeiro', 'Configurações',
];
const outputDir = path.join(__dirname, 'responsive');
fs.mkdirSync(outputDir, { recursive: true });

function browserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

(async () => {
  const executablePath = browserExecutable();
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const results = [];
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('response', (item) => {
        if (item.status() >= 400 && !item.url().endsWith('/favicon.ico')) {
          errors.push(`http ${item.status()}: ${item.url()}`);
        }
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
          errors.push(`console: ${message.text()}`);
        }
      });
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#nav button');
      const labels = await page.locator('#nav button').allTextContents();
      for (const view of expectedViews) {
        const button = page.getByRole('button', { name: new RegExp(`^${view}`) });
        if (await button.count() !== 1) throw new Error(`${width}px: navegação ausente: ${view}`);
        await button.click();
        await page.waitForTimeout(30);
        const title = (await page.locator('#titulo').textContent()).trim();
        if (title !== view) throw new Error(`${width}px: título esperado ${view}, obtido ${title}`);
      }
      const state = await page.evaluate(() => ({
        bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        navVisible: getComputedStyle(document.querySelector('#nav')).display !== 'none',
        passwordInputs: document.querySelectorAll('input[type="password"]').length,
        forbiddenText: /hostgator|cpanel/i.test(document.body.innerText),
        contentLength: document.querySelector('#view').innerText.trim().length,
      }));
      await page.screenshot({ path: path.join(outputDir, `dashboard-${width}.png`), fullPage: true });
      const ok = response && response.ok() && labels.length === expectedViews.length && !state.bodyOverflow &&
        state.navVisible && state.passwordInputs === 0 && !state.forbiddenText && state.contentLength > 0 && errors.length === 0;
      results.push({ width, http: response && response.status(), views: labels.length, ...state, errors, ok });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
