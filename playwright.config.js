require('dotenv').config();

const { defineConfig } = require('@playwright/test');

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const missing = [
  ['base PostgreSQL', databaseUrl],
  ['JWT_SECRET', process.env.JWT_SECRET],
  ['DATA_ENCRYPTION_SECRET', process.env.DATA_ENCRYPTION_SECRET],
  ['ADMIN_EMAIL', process.env.ADMIN_EMAIL],
  ['ADMIN_PASSWORD', process.env.ADMIN_PASSWORD]
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length) {
  throw new Error(`Configure el entorno de pruebas de interfaz: ${missing.join(', ')}.`);
}

const baseURL = process.env.ATLAS_E2E_BASE_URL || 'http://127.0.0.1:3339';

module.exports = defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  reporter: 'list',
  outputDir: 'test-results/accessibility',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node src/server.js',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: process.env.ATLAS_E2E_PORT || '3339'
    }
  }
});
