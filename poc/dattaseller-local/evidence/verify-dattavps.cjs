const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = process.env.DATTASELLER_URL || 'http://127.0.0.1:8765';
const slug = 'teste-dattavps-cta';
const configPath = path.join(__dirname, '..', 'app', 'prospector-config.json');

async function request(route, method = 'GET', body) {
  const response = await fetch(base + route, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  return { status: response.status, json };
}

(async () => {
    const executableCandidates = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const executablePath = executableCandidates.find(fs.existsSync);
    const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    let page;
    try {
      const disabled = await request('/api/config', 'PUT', { dattavps: { enabled: false } });
      const invalid = await request('/api/config', 'PUT', {
        dattavps: { enabled: true, offer_name: 'Teste', offer_description: 'Teste', offer_price: '99', checkout_url: 'http://inseguro.example' },
      });
      const valid = await request('/api/config', 'PUT', {
        dattavps: { enabled: true, offer_name: 'Plano de teste', offer_description: 'Oferta temporária de validação', offer_price: '99', checkout_url: 'https://checkout.example.test/plano' },
      });
      await request('/api/leads', 'POST', {
        slug, nome: 'Lead de teste DattaVPS', status: 'novo', product_suggested: 'dattavps', source_url: 'https://example.test.test/fonte', source_checked_at: '2026-09-12', public_contact_type: 'formulario',
      });

      page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /^Pipeline/ }).click();
      const present = page.getByRole('link', { name: 'apresentar DattaVPS' });
      if (await present.count() !== 1) throw new Error('CTA de apresentação não apareceu para lead aderente');
      await present.click();
      await page.waitForFunction((testSlug) => fetch('/api/leads').then(r => r.json()).then(rows => rows.some(l => l.slug === testSlug && l.checkout_presented_at)), slug);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /^Pipeline/ }).click();
      await page.evaluate(() => { window.open = () => null; });
      const checkout = page.getByRole('link', { name: 'checkout DattaVPS ↗' });
      if (await checkout.count() !== 1) throw new Error('CTA de checkout não apareceu após apresentação');
      await checkout.click();
      await page.waitForFunction((testSlug) => fetch('/api/leads').then(r => r.json()).then(rows => rows.some(l => l.slug === testSlug && l.checkout_clicked_at)), slug);
      const lead = (await request('/api/leads')).json.find((item) => item.slug === slug);
      const result = {
        disabledAccepted: disabled.status === 200,
        insecureUrlRejected: invalid.status === 400,
        validOfferAccepted: valid.status === 200,
        exactCheckoutUrl: lead.checkout_url === 'https://checkout.example.test/plano',
        presentationRecorded: Boolean(lead.checkout_presented_at),
        clickRecorded: Boolean(lead.checkout_clicked_at),
        distinctEvents: lead.checkout_presented_at !== lead.checkout_clicked_at,
        deliveryStateUpdated: lead.delivery_status === 'checkout_acessado',
      };
      fs.writeFileSync(path.join(__dirname, 'dattavps-results.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result, null, 2));
      if (Object.values(result).some((value) => value !== true)) process.exitCode = 1;
    } finally {
      if (page) await page.close();
      await browser.close();
      await request(`/api/leads/${slug}`, 'DELETE').catch(() => {});
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
