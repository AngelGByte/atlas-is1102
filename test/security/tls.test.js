const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const test = require('node:test');

const host = process.env.ATLAS_TLS_HOST || 'localhost';
const httpPort = Number(process.env.ATLAS_TLS_HTTP_PORT || 8080);
const httpsPort = Number(process.env.ATLAS_TLS_HTTPS_PORT || 8443);

function request(protocol, port, path, rejectUnauthorized = true) {
  const client = protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get({
      hostname: host,
      port,
      path,
      rejectUnauthorized
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
  });
}

test('la configuración TLS no publica puertos de aplicación o base de datos', () => {
  const result = spawnSync('docker', [
    'compose', '-f', 'docker-compose.tls.yml', 'config', '--format', 'json'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || 'No se pudo validar Docker Compose.');
  const config = JSON.parse(result.stdout);
  assert.equal(config.services.app.ports, undefined);
  assert.equal(config.services.db.ports, undefined);
  assert.equal(config.services.caddy.ports.length, 2);
});

test('HTTPS responde 200 en /api/health y publica HSTS', async () => {
  const response = await request('https:', httpsPort, '/api/health', false);
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['strict-transport-security'] || '', /max-age=/);
});

test('HTTP redirige a la URL HTTPS de laboratorio', async () => {
  const response = await request('http:', httpPort, '/api/health');
  assert.equal(response.statusCode, 308);
  assert.equal(response.headers.location, `https://${host}:${httpsPort}/api/health`);
});
