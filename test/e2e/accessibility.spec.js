const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const evidenceDirectory = process.env.ATLAS_ACCESSIBILITY_EVIDENCE_DIR
  ? path.resolve(process.env.ATLAS_ACCESSIBILITY_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../docs/evidencias/ui');

test.beforeAll(() => {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
});

async function signIn(page) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(process.env.ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen', level: 1 })).toBeVisible();
}

async function checkAccessibility(page, screenshotName) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const severe = results.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious'
  );
  const report = severe.map((violation) =>
    `${violation.id}: ${violation.help} (${violation.nodes.length} elementos)`
  ).join('\n');
  await page.screenshot({
    path: path.join(evidenceDirectory, screenshotName),
    fullPage: false
  });
  expect(severe, report || 'No se detectaron problemas críticos o graves.').toEqual([]);
}

async function openClients(page) {
  await signIn(page);
  if (await page.evaluate(() => window.innerWidth <= 760)) {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  }
  await page.getByRole('button', { name: /Clientes/ }).click();
  await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible();
}

for (const viewport of [
  { name: 'escritorio 1280x800', suffix: '1280x800', size: { width: 1280, height: 800 } },
  { name: 'móvil 390x844', suffix: '390x844', size: { width: 390, height: 844 } },
  { name: 'móvil estrecho 320x700', suffix: '320x700', size: { width: 320, height: 700 } }
]) {
  test.describe(`Accesibilidad en ${viewport.name}`, () => {
    test.use({ viewport: viewport.size });

    test('inicio de sesión: etiquetas, contraste y foco', async ({ page }) => {
      await page.goto('/');
      await checkAccessibility(page, `login-${viewport.suffix}.png`);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const focus = await page.locator('#login-form button[type="submit"]')
        .evaluate((element) => getComputedStyle(element).outlineWidth);
      expect(Number.parseFloat(focus)).toBeGreaterThan(0);
    });

    test('listado de clientes: tabla legible y navegación por teclado', async ({ page }) => {
      await openClients(page);
      await page.keyboard.press('Tab');
      const focusedOutline = await page.locator(':focus-visible')
        .evaluate((element) => getComputedStyle(element).outlineWidth);
      expect(Number.parseFloat(focusedOutline)).toBeGreaterThan(0);
      for (const selector of ['.nav-item[data-view="clients"]', '.brand']) {
        await page.keyboard.press('Tab');
        const element = page.locator(selector);
        await element.focus();
        const focusStyle = await element.evaluate((focused) => ({
          width: getComputedStyle(focused).outlineWidth,
          style: getComputedStyle(focused).outlineStyle
        }));
        expect(Number.parseFloat(focusStyle.width)).toBeGreaterThan(0);
        expect(focusStyle.style).not.toBe('none');
      }
      const overflowsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflowsViewport).toBe(false);
      await checkAccessibility(page, `clientes-${viewport.suffix}.png`);
    });

    test('formulario de cliente: campos etiquetados, foco visible y adaptación', async ({ page }) => {
      await openClients(page);
      await page.getByRole('button', { name: /Nuevo/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel('Nombre de contacto')).toBeVisible();
      await page.keyboard.press('Tab');
      await page.locator('#dialog-submit').focus();
      const focus = await page.locator('#dialog-submit')
        .evaluate((element) => getComputedStyle(element).outlineWidth);
      expect(Number.parseFloat(focus)).toBeGreaterThan(0);
      const overflowsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflowsViewport).toBe(false);
      await checkAccessibility(page, `formulario-${viewport.suffix}.png`);
    });
  });
}
