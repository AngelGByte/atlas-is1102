require('dotenv').config();

const { chromium, expect } = require('@playwright/test');
const path = require('node:path');

const baseUrl = process.env.PRESENTATION_BASE_URL || 'http://127.0.0.1:3334';
const outputDir = path.resolve(
  __dirname,
  '..',
  'docs',
  'evidencias',
  'final',
  'ui-presentation-2026-11-21'
);

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the process environment.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(baseUrl);
    await page.locator('#login-email').fill(process.env.ADMIN_EMAIL);
    await page.locator('#login-password').fill(process.env.ADMIN_PASSWORD);
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.getByRole('heading', { name: 'Resumen', level: 1 })).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'dashboard-390x844.png') });

    for (const [view, title, filename] of [
      ['clients', 'Clientes', 'clientes-390x844.png'],
      ['contracts', 'Contratos', 'contratos-390x844.png']
    ]) {
      await page.locator('#menu-button').click();
      await page.locator(`.nav-item[data-view="${view}"]`).click();
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await page.locator('#menu-button').click({ force: true });
      await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(outputDir, filename) });
    }

    console.log('PASS: dashboard, clients, and contracts captured at 390x844.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`FAIL: UI screenshot capture: ${error.message}`);
  process.exitCode = 1;
});
