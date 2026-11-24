const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');
const jwt = require('jsonwebtoken');
const { once } = require('node:events');

const requiredEnvironment = [
  'DATABASE_URL',
  'JWT_SECRET',
  'DATA_ENCRYPTION_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length) {
  console.error(`Faltan variables requeridas para la prueba de seguridad: ${missingEnvironment.join(', ')}`);
  process.exitCode = 1;
} else {
  runSecurityChecks().catch((error) => {
    console.error(`No fue posible ejecutar la prueba dinámica: ${error.message}`);
    process.exitCode = 1;
  });
}

async function runSecurityChecks() {
  const port = Number(process.env.ATLAS_SECURITY_PORT || 3338);
  const invalidSignatureSecret = randomBytes(32).toString('hex');
  const invalidLoginPassword = randomBytes(24).toString('base64url');
  const securityClientIp = getLoopbackAddress();
  const securitySourceIp = getLoopbackAddress();
  const baseUrl = `http://${securityClientIp}:${port}`;
  const server = startServer(port, process.env.WEB_CONCURRENCY || '2');

  const failures = [];
  const check = async (id, description, action) => {
    try {
      await action();
      console.log(`APROBADO ${id}: ${description}`);
    } catch (error) {
      failures.push({ id, description, message: error.message });
      console.error(`FALLÓ ${id}: ${description} — ${error.message}`);
    }
  };
  const response = (path, options) => fetch(new URL(path, baseUrl), options);

  try {
    await waitForServer(server, baseUrl, () => server.errors);
    const health = await response('/api/health');
    const tokenLogin = await login({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
    });
    const loginBody = await tokenLogin.json();
    const token = loginBody.token;
    const auth = token ? { Authorization: `Bearer ${token}` } : {};

    await check('S-00', 'el endpoint de salud responde 200', async () => {
      assert.equal(health.status, 200);
    });
    await check('S-01', 'X-Content-Type-Options es nosniff', async () => {
      assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    });
    await check('S-02', 'la política CSP está presente', async () => {
      assert.ok(health.headers.get('content-security-policy'));
    });
    await check('S-03', 'la respuesta no expone X-Powered-By', async () => {
      assert.equal(health.headers.get('x-powered-by'), null);
    });
    await check('S-04', 'X-Frame-Options es SAMEORIGIN', async () => {
      assert.equal(health.headers.get('x-frame-options'), 'SAMEORIGIN');
    });
    await check('S-05', 'Strict-Transport-Security está presente', async () => {
      assert.ok(health.headers.get('strict-transport-security'));
    });
    await check('S-06', 'una solicitud protegida sin token responde 401', async () => {
      assert.equal((await response('/api/clients')).status, 401);
    });
    await check('S-07', 'un token malformado responde 401', async () => {
      const result = await response('/api/clients', {
        headers: { Authorization: 'Bearer esto-no-es-un-jwt' }
      });
      assert.equal(result.status, 401);
    });
    await check('S-08', 'un JWT con firma falsa responde 401', async () => {
      const forged = jwt.sign({ id: 1 }, invalidSignatureSecret, {
        issuer: 'atlas',
        audience: 'atlas-web'
      });
      const result = await response('/api/clients', {
        headers: { Authorization: `Bearer ${forged}` }
      });
      assert.equal(result.status, 401);
    });
    await check('S-09', 'un JWT con algoritmo none responde 401', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 1, iss: 'atlas', aud: 'atlas-web' })).toString('base64url');
      const result = await response('/api/clients', {
        headers: { Authorization: `Bearer ${header}.${payload}.` }
      });
      assert.equal(result.status, 401);
    });
    await check('S-10', 'un JWT expirado responde 401', async () => {
      const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, {
        issuer: 'atlas',
        audience: 'atlas-web',
        expiresIn: -1
      });
      const result = await response('/api/clients', {
        headers: { Authorization: `Bearer ${expired}` }
      });
      assert.equal(result.status, 401);
    });
    await check('S-11', 'la inyección SQL en login no autentica', async () => {
      const result = await login({ email: "' OR 1=1 --", password: invalidLoginPassword });
      assert.equal(result.status, 401);
      assert.equal((await result.json()).token, undefined);
    });
    await check('S-12', 'un objeto en el correo de login responde 400', async () => {
      const result = await login({ email: { operador: 'ne' }, password: invalidLoginPassword });
      assert.equal(result.status, 400);
    });
    await check('S-13', 'el JSON malformado responde 400 sin detalles del parser', async () => {
      const result = await response('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email":'
      });
      assert.equal(result.status, 400);
      const body = await result.json();
      assert.deepEqual(body, { message: 'El cuerpo de la solicitud no es un JSON válido.' });
      assert.equal(JSON.stringify(body).includes('Unexpected'), false);
      assert.equal('stack' in body, false);
    });
    await check('S-14', 'un cuerpo de 150 KB responde 413 sin detalles internos', async () => {
      const result = await response('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: 'x'.repeat(150 * 1024) })
      });
      assert.equal(result.status, 413);
      const body = await result.json();
      assert.deepEqual(body, { message: 'El cuerpo de la solicitud supera el tamaño permitido.' });
      assert.equal('stack' in body, false);
    });
    await check('S-15', 'un valor SQL en un parámetro de ruta responde 4xx', async () => {
      const result = await response('/api/clients/1%20OR%201%3D1', {
        headers: auth
      });
      assert.ok(result.status >= 400 && result.status < 500);
    });
    await check('S-16', 'el payload XSS se conserva como texto y la cuenta se enmascara', async () => {
      assert.equal(tokenLogin.status, 200);
      assert.ok(token);
      const name = '<script>alert("sintético")</script>';
      const created = await response('/api/clients', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company: 'Empresa sintética de seguridad',
          email: `seguridad-${Date.now()}@example.test`,
          bankAccount: '001234567890',
          notes: '<img src=x onerror=alert(1)>'
        })
      });
      assert.equal(created.status, 201);
      const client = await created.json();
      try {
        assert.equal(client.name, name);
        assert.equal(client.bankAccountLast4, '7890');
        assert.equal(JSON.stringify(client).includes('001234567890'), false);
        const listed = await response('/api/clients', { headers: auth });
        assert.equal(listed.status, 200);
        const stored = (await listed.json()).find((item) => item.id === client.id);
        assert.equal(stored.name, name);
        assert.equal(stored.bankAccountLast4, '7890');
        assert.equal(JSON.stringify(stored).includes('001234567890'), false);
      } finally {
        if (client.id) {
          const removed = await response(`/api/clients/${client.id}`, {
            method: 'DELETE',
            headers: auth
          });
          assert.equal(removed.status, 204);
        }
      }
    });
    await check('S-17', 'la API declara application/json', async () => {
      assert.match(health.headers.get('content-type') || '', /^application\/json\b/i);
    });
    await check('S-18', 'el límite global entre dos procesos rechaza el intento 11 con 429', async () => {
      const replicaPorts = [port + 1, port + 2];
      const replicas = replicaPorts.map((replicaPort) => startServer(replicaPort, '1'));
      const distributedIp = getLoopbackAddress();
      const distributedSourceIp = getLoopbackAddress();
      const replicaUrls = replicaPorts.map((replicaPort) =>
        `http://${distributedIp}:${replicaPort}`
      );

      try {
        for (let index = 0; index < replicas.length; index += 1) {
          await waitForServer(
            replicas[index],
            `http://${distributedIp}:${replicaPorts[index]}`,
            () => replicas[index].errors
          );
        }
        const workerCount = Math.min(Number(process.env.WEB_CONCURRENCY || 2), os.availableParallelism());
        await waitForWorkerCount(server, workerCount, () => server.output);
        assert.equal(
          (server.output.match(/Atlas escuchando en el puerto/g) || []).length,
          workerCount,
          'El proceso principal debe mantener activos todos sus workers configurados.'
        );

        for (let attempt = 0; attempt < 10; attempt += 1) {
          const response = await loginAt(replicaUrls[attempt % replicaUrls.length], {
            email: process.env.ADMIN_EMAIL,
            password: invalidLoginPassword
          }, distributedSourceIp);
          assert.equal(response.status, 401, `intento distribuido ${attempt + 1}`);
        }
        const limited = await loginAt(replicaUrls[0], {
          email: process.env.ADMIN_EMAIL,
          password: invalidLoginPassword
        }, distributedSourceIp);
        assert.equal(limited.status, 429);
      } finally {
        await Promise.all(replicas.map(stopServer));
      }
    });
  } finally {
    await stopServer(server);
  }

  console.log(`Resumen: ${19 - failures.length}/19 verificaciones aprobadas; ${failures.length} fallidas.`);
  if (failures.length) process.exitCode = 1;

  async function login(body) {
    return loginAt(baseUrl, body, securitySourceIp);
  }

  async function loginAt(url, body, localAddress) {
    const requestUrl = new URL('/api/auth/login', url);
    const payload = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    if (!localAddress) {
      return fetch(requestUrl, { ...options, body: payload });
    }

    return new Promise((resolve, reject) => {
      const request = http.request(requestUrl, { ...options, localAddress, agent: false }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8'))
        }));
      });
      request.on('error', reject);
      request.end(payload);
    });
  }
}

function startServer(port, workerCount) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), WEB_CONCURRENCY: workerCount },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.output = '';
  child.errors = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    child.output = `${child.output}${chunk}`.slice(-4000);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    child.errors = `${child.errors}${chunk}`.slice(-4000);
  });
  return child;
}

function getLoopbackAddress() {
  const bytes = randomBytes(3);
  return `127.${bytes[0]}.${bytes[1]}.${Math.max(1, bytes[2])}`;
}

async function waitForWorkerCount(server, expectedCount, getOutput) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`El servidor terminó antes de iniciar todos sus workers. ${server.errors}`);
    }
    const activeCount = (getOutput().match(/Atlas escuchando en el puerto/g) || []).length;
    if (activeCount >= expectedCount) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`El proceso no inició ${expectedCount} workers. ${getOutput()}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await once(server, 'exit');
}

async function waitForServer(server, baseUrl, getErrors) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`El servidor terminó antes de iniciar. ${getErrors()}`);
    }
    try {
      const result = await fetch(new URL('/api/health', baseUrl), { signal: AbortSignal.timeout(2000) });
      if (result.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`El servidor no alcanzó /api/health dentro de 60 s. ${getErrors()}`);
}
